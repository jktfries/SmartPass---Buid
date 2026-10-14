<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class AuditRequestMiddleware
{
    // Only these HTTP methods produce audit log entries
    private const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

    // Route prefixes whose logs would cause infinite recursion — skip them
    private const SKIP_PREFIXES = [
        'api/auth/login',
        'api/notifications',
        'api/sysadmin/audit-logs',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (!in_array($request->method(), self::MUTATING_METHODS, true)) {
            return $response;
        }

        $path = ltrim($request->path(), '/');
        foreach (self::SKIP_PREFIXES as $prefix) {
            if (str_starts_with($path, $prefix)) {
                return $response;
            }
        }

        // Only log successful mutations (2xx + 3xx)
        if ($response->getStatusCode() >= 400) {
            return $response;
        }

        try {
            $user = $request->user();
            $category = $this->deriveCategory($path);
            $action   = $request->method() . ' /' . $path;
            $detail   = $this->summariseBody($request);

            DB::table('audit_logs')->insert([
                'actor_id'   => $user?->id,
                'category'   => $category,
                'severity'   => $request->method() === 'DELETE' ? 'warning' : 'info',
                'action'     => $action,
                'detail'     => $detail,
                'ip_address' => $request->ip(),
                'user_agent' => substr($request->userAgent() ?? '', 0, 255),
                'created_at' => now(),
            ]);
        } catch (\Throwable) {
            // Never let audit logging break the response
        }

        return $response;
    }

    private function deriveCategory(string $path): string
    {
        return match (true) {
            str_contains($path, 'auth')        => 'auth',
            str_contains($path, 'attendance')  => 'attendance',
            str_contains($path, 'rfid')        => 'attendance',
            str_contains($path, 'wellness')    => 'wellness',
            str_contains($path, 'appointment') => 'wellness',
            str_contains($path, 'users')       => 'user_management',
            str_contains($path, 'students')    => 'user_management',
            str_contains($path, 'settings')    => 'system',
            str_contains($path, 'sysadmin')    => 'system',
            str_contains($path, 'superadmin')  => 'system',
            default                            => 'data',
        };
    }

    private function summariseBody(Request $request): ?string
    {
        $body = $request->except(['password', 'password_confirmation', 'current_password']);
        if (empty($body)) return null;
        $json = json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        return $json !== false ? substr($json, 0, 500) : null;
    }
}
