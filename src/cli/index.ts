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

import { parseArgs } from 'util';
import { findConfigFile, loadConfigSafe } from './config-loader';
import { syncSchemas, previewSync } from './sync';
import type { ContentTypeConfig } from './config-loader';

// ============================================
// ARGUMENT PARSING
// ============================================

export interface CliArgs {
    command: string;
    dry?: boolean;
    verbose?: boolean;
    config?: string;
    help?: boolean;
}
export function parseCliArgs(argv?: string[]): CliArgs {
    // Allow injecting argv for tests; default to process argv otherwise.
    const rawArgs = argv ?? process.argv.slice(2);

    // If no args provided, show help
    if (!rawArgs || rawArgs.length === 0) {
        return { command: 'help', help: true };
    }

    // Global flags that can appear before/after the command
    if (rawArgs.includes('--help') || rawArgs.includes('-h')) {
        return { command: 'help', help: true };
    }
    if (rawArgs.includes('--version') || rawArgs.includes('-v')) {
        return { command: 'version', help: false };
    }

    // Find the first non-flag token and treat it as the command. This allows
    // callers to pass flags before the command, e.g. `decoupla --verbose sync`.
    const firstPositional = rawArgs.find((a) => !a.startsWith('-'));
    const command = firstPositional || 'help';

    // Parse options (allow positionals to keep parsing simple) and pick flags
    const parsed = parseArgs({
        args: rawArgs,
        options: {
            dry: { type: 'boolean', default: false },
            verbose: { type: 'boolean', default: false },
            config: { type: 'string' },
            help: { type: 'boolean', default: false },
            version: { type: 'boolean', default: false },
        },
        allowPositionals: true,
    });

    const { dry, verbose, config, help } = parsed.values as any;

    return {
        command,
        dry: dry === true,
        verbose: verbose === true,
        config: config as string | undefined,
        help: help === true,
    };
}

// ============================================
// COMMAND HANDLERS
// ============================================

async function handleSync(args: CliArgs): Promise<void> {
    const result = await loadConfigSafe(args.config);

    if ('error' in result) {
        console.error(`❌ ${result.error}`);
        process.exit(1);
    }

    const { config } = result;

    if (args.dry) {
        const syncResult = await previewSync(config);
        if (!syncResult.success) {
            process.exit(1);
        }
    } else {
        const syncResult = await syncSchemas(config, { verbose: args.verbose });
        if (!syncResult.success) {
            process.exit(1);
        }
    }
}

async function handleValidate(args: CliArgs): Promise<void> {
    const result = await loadConfigSafe(args.config);

    if ('error' in result) {
        console.error(`❌ ${result.error}`);
        process.exit(1);
    }

    const { config } = result;

    console.log(`✅ Config file is valid`);
    console.log('');
    console.log(`API Token: ${config.apiToken.slice(0, 10)}...`);
    console.log(`Workspace: ${config.workspace}`);
    console.log('');
    console.log(`Content Types (${config.contentTypes.length}):`);

    for (const ct of config.contentTypes) {
        const ctDef = ('__isContentTypeDefinition' in ct && ct.__isContentTypeDefinition)
            ? (ct as any).__definition
            : ct as any;
        const fieldCount = Object.keys(('__isContentTypeDefinition' in ct && ct.__isContentTypeDefinition)
            ? (ct as any).__fields
            : (ct as any).schema).length;
        const requiredFields = Object.values(('__isContentTypeDefinition' in ct && ct.__isContentTypeDefinition)
            ? (ct as any).__fields
            : (ct as any).schema).filter((f: any) => f.required).length;
        console.log(`  - ${ctDef.name}`);
        console.log(`    Fields: ${fieldCount} (${requiredFields} required)`);
        if (ctDef.displayName) {
            console.log(`    Display: ${ctDef.displayName}`);
        }
    }
}

// ============================================
// HELP TEXT
// ============================================

function showHelp(): void {
    console.log(`
📦 Decoupla CLI - Schema Management Tool

USAGE:
  decoupla <command> [options]

COMMANDS:
  sync          Synchronize local schemas with remote backend
  validate      Validate configuration file
  help          Show this help message

OPTIONS:
  --dry         (sync) Preview changes without applying
  --verbose     Show detailed output
  --config      Path to config file (default: decoupla.config.ts)
  --help        Show help for a command

EXAMPLES:
  # Preview what would be synced
  decoupla sync --dry --verbose

  # Apply synchronization
  decoupla sync

  # Validate config
  decoupla validate

CONFIG FILE:
  Create a decoupla.config.ts file in your project root:

    import { defineSchema } from 'decoupla.js';

    export default {
      apiToken: process.env.DECOUPLA_TOKEN!,
      workspace: 'my-workspace',
      contentTypes: [
        {
          name: 'author',
          displayName: 'Author',
          schema: defineSchema({
            name: { type: 'string', required: true },
            email: { type: 'string', required: false },
          } as const),
        },
      ],
    };
`);
}

function showVersion(): void {
    console.log(getVersionString());
}

/**
 * Return the version string for the CLI.
 *
 * Build-time bundles will replace the token `__PACKAGE_VERSION__` with the
 * actual version string via `tsup`'s `define` option. When running directly
 * from source (during development or unit tests) we fall back to reading
 * package.json from the working directory.
 */
export function getVersionString(): string {
    // This token will be replaced at build-time. When running from source
    // it will literally be the string '__PACKAGE_VERSION__'.
    const embedded = '__PACKAGE_VERSION__';
    if (embedded && embedded !== '__PACKAGE_VERSION__') {
        return embedded;
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        // @ts-ignore - dynamic require
        const pkg = require(`${process.cwd()}/package.json`);
        if (pkg && pkg.version) return String(pkg.version);
    } catch (e) {
        // ignore
    }

    return 'unknown';
}

// ============================================
// MAIN ENTRY POINT
// ============================================

async function main(): Promise<void> {
    const args = parseCliArgs();

    if (args.help && args.command !== 'help') {
        showHelp();
        return;
    }

    switch (args.command) {
        case 'sync':
            await handleSync(args);
            break;
        case 'validate':
            await handleValidate(args);
            break;
        case 'version':
            showVersion();
            break;
        case 'help':
            showHelp();
            break;
        default:
            console.error(`❌ Unknown command: ${args.command}`);
            console.log('Run "decoupla help" for usage information');
            process.exit(1);
    }
}

// Only run the CLI main when executed directly. This prevents the module from
// running when imported by unit tests.
// eslint-disable-next-line @typescript-eslint/no-var-requires
if (typeof require !== 'undefined' && require.main === module) {
    main().catch(error => {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
        process.exit(1);
    });
}
