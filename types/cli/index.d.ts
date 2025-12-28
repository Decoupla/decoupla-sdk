#!/usr/bin/env bun
/**
 * Decoupla CLI - Schema management and synchronization tool
 *
 * Commands:
 *   decoupla sync         - Sync local schemas with remote backend
 *   decoupla sync --dry   - Preview changes without applying
 *   decoupla validate     - Validate schema definitions
 *   decoupla help         - Show help message
 *
 * Usage:
 *   decoupla sync [--dry] [--verbose]
 *   decoupla validate
 */
export interface CliArgs {
    command: string;
    dry?: boolean;
    verbose?: boolean;
    config?: string;
    help?: boolean;
}
export declare function parseCliArgs(argv?: string[]): CliArgs;
/**
 * Return the version string for the CLI.
 *
 * Build-time bundles will replace the token `__PACKAGE_VERSION__` with the
 * actual version string via `tsup`'s `define` option. When running directly
 * from source (during development or unit tests) we fall back to reading
 * package.json from the working directory.
 */
export declare function getVersionString(): string;
