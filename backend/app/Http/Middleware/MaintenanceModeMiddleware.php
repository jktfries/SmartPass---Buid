<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class MaintenanceModeMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Admins are never blocked, even in maintenance.
        //
        // system_admin MUST be on this list, not just super_admin: the System
        // Settings page that holds the maintenance toggle is reachable by
        // role:system_admin. Exempting only super_admin meant a system_admin
        // could switch maintenance on and then be locked out of every route —
        // including the page with the off switch, and including the dashboard
        // banner that would have explained why. The only way back was editing
        // the database by hand.
        //
        // Rule: whoever can reach the switch must still be able to reach it
        // afterwards.
        if (in_array($user?->role, ['system_admin', 'super_admin'], true)) {
            return $next($request);
        }

        $mode = DB::table('system_settings')
            ->where('key', 'maintenance_mode')
            ->value('value');

        if ($mode === '1') {
            return response()->json([
                'message' => 'System is currently under maintenance. Please try again later.',
                'code'    => 'maintenance_mode',
            ], 503);
        }

        return $next($request);
    }
}
