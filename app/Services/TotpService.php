<?php

namespace App\Services;

class TotpService
{
    private const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    public function generateSecret(): string
    {
        return $this->base32Encode(random_bytes(20));
    }

    public function getQrUri(string $userLabel, string $secret, string $issuer = 'Smart Stock'): string
    {
        return sprintf(
            'otpauth://totp/%s?secret=%s&issuer=%s&algorithm=SHA1&digits=6&period=30',
            rawurlencode("{$issuer}:{$userLabel}"),
            $secret,
            rawurlencode($issuer)
        );
    }

    public function verify(string $secret, string $code, int $window = 1): bool
    {
        $raw  = $this->base32Decode($secret);
        $time = (int) floor(time() / 30);

        for ($i = -$window; $i <= $window; $i++) {
            if ($this->computeCode($raw, $time + $i) === $code) {
                return true;
            }
        }

        return false;
    }

    private function computeCode(string $secret, int $counter): string
    {
        $msg  = pack('N*', 0) . pack('N*', $counter);
        $hmac = hash_hmac('sha1', $msg, $secret, true);
        $off  = ord($hmac[19]) & 0x0F;

        $code = (
            (ord($hmac[$off])     & 0x7F) << 24 |
            (ord($hmac[$off + 1]) & 0xFF) << 16 |
            (ord($hmac[$off + 2]) & 0xFF) << 8  |
            (ord($hmac[$off + 3]) & 0xFF)
        ) % 1_000_000;

        return str_pad((string) $code, 6, '0', STR_PAD_LEFT);
    }

    private function base32Encode(string $data): string
    {
        $out      = '';
        $buf      = 0;
        $bits     = 0;
        $len      = strlen($data);

        for ($i = 0; $i < $len; $i++) {
            $buf   = ($buf << 8) | ord($data[$i]);
            $bits += 8;
            while ($bits >= 5) {
                $bits -= 5;
                $out  .= self::CHARS[($buf >> $bits) & 0x1F];
            }
        }

        if ($bits > 0) {
            $out .= self::CHARS[($buf << (5 - $bits)) & 0x1F];
        }

        return $out;
    }

    private function base32Decode(string $data): string
    {
        $data = strtoupper($data);
        $out  = '';
        $buf  = 0;
        $bits = 0;
        $len  = strlen($data);

        for ($i = 0; $i < $len; $i++) {
            $pos = strpos(self::CHARS, $data[$i]);
            if ($pos === false) {
                continue;
            }
            $buf   = ($buf << 5) | $pos;
            $bits += 5;
            if ($bits >= 8) {
                $bits -= 8;
                $out  .= chr(($buf >> $bits) & 0xFF);
            }
        }

        return $out;
    }
}
