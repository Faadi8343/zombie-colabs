<?php
// Zombie Colabs contact handler: validates, appends to leads.csv, emails the team.
header('Content-Type: application/json');

const TO_EMAIL = 'info@zombiecolabs.com';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['ok' => false, 'error' => 'POST only']));
}

// Honeypot: bots fill hidden fields. Pretend success.
if (!empty($_POST['website'])) exit(json_encode(['ok' => true]));

$name    = trim((string)($_POST['name'] ?? ''));
$email   = trim((string)($_POST['email'] ?? ''));
$service = trim((string)($_POST['service'] ?? ''));
$message = trim((string)($_POST['message'] ?? ''));

if ($name === '' || mb_strlen($name) > 100
    || !filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 150
    || $service === '' || mb_strlen($service) > 60
    || $message === '' || mb_strlen($message) > 3000) {
    http_response_code(422);
    exit(json_encode(['ok' => false, 'error' => 'Invalid input']));
}

// Strip CR/LF to block header injection; neutralise CSV formula injection.
$clean = fn($s) => preg_replace('/[\r\n]+/', ' ', $s);
$csv   = fn($s) => preg_match('/^[=+\-@]/', $s) ? "'" . $s : $s;

$fh = fopen(__DIR__ . '/leads.csv', 'a');
if (!$fh) {
    http_response_code(500);
    exit(json_encode(['ok' => false, 'error' => 'Storage unavailable']));
}
flock($fh, LOCK_EX);
fputcsv($fh, array_map($csv, [date('c'), $clean($name), $clean($email), $clean($service), $clean($message)]));
flock($fh, LOCK_UN);
fclose($fh);

// mail() needs a configured SMTP (not set up on stock XAMPP); lead is already saved above.
@mail(
    TO_EMAIL,
    'New lead: ' . $clean($service) . ' — ' . $clean($name),
    "Name: $name\nEmail: $email\nService: $service\n\n$message",
    'Reply-To: ' . $clean($email)
);

echo json_encode(['ok' => true]);
