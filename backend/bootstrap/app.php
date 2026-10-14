<?php

use App\Http\Middleware\AuditRequestMiddleware;
use App\Http\Middleware\MaintenanceModeMiddleware;
use App\Http\Middleware\RoleMiddleware;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Sanctum stateful middleware for SPA cookie auth on the api group
        $middleware->statefulApi();

        // Register middleware aliases
        $middleware->alias([
            'role'        => RoleMiddleware::class,
            'maintenance' => MaintenanceModeMiddleware::class,
        ]);

        // Auto-audit all mutating API requests (after response, non-blocking)
        $middleware->appendToGroup('api', AuditRequestMiddleware::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
