/**
 * Secrets Helper - Load secrets from environment variables or files with masking in logs
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * Masks a secret value for safe logging
 * Shows first few characters and masks the rest
 * @param value - The secret value to mask
 * @param visibleChars - Number of characters to show at the start (default: 4)
 * @returns Masked string like "sk-****..."
 */
export function maskSecret(value: string | undefined | null, visibleChars: number = 4): string {
  if (value === undefined || value === null) {
    return '[undefined]';
  }
  if (value.length <= visibleChars) {
    return '*'.repeat(value.length);
  }
  return `${value.slice(0, visibleChars)}${'*'.repeat(value.length - visibleChars)}`;
}

/**
 * Load a secret from an environment variable
 * @param name - Environment variable name
 * @param required - Whether the secret is required (throws if missing)
 * @returns The secret value or undefined if not required
 * @throws Error if required secret is missing
 */
export function getSecret(name: string, required: boolean = false): string | undefined {
  const value = process.env[name];
  
  if (required && !value) {
    throw new Error(`Required secret ${name} is not set`);
  }
  
  return value;
}

/**
 * Load secrets from a .env file
 * @param filePath - Path to the .env file
 * @returns Map of secret names to values
 */
export function loadSecretsFromFile(filePath: string): Record<string, string> {
  const secrets: Record<string, string> = {};
  
  if (!fs.existsSync(filePath)) {
    return secrets;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex === -1) {
      continue;
    }
    
    const key = trimmed.slice(0, equalIndex).trim();
    let value = trimmed.slice(equalIndex + 1).trim();
    
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    // Set in process.env and local map
    secrets[key] = value;
    process.env[key] = value;
  }
  
  return secrets;
}

/**
 * Load secrets from a .env file in the given directory
 * @param dir - Directory to look for .env file
 * @param filename - Optional custom filename (default: '.env')
 * @returns Map of secret names to values
 */
export function loadEnvFile(dir: string, filename: string = '.env'): Record<string, string> {
  const filePath = path.resolve(dir, filename);
  return loadSecretsFromFile(filePath);
}

/**
 * SecretsManager - A class for managing multiple secrets with logging support
 */
export class SecretsManager {
  private secrets: Map<string, string> = new Map();
  private loadedFrom: Map<string, string> = new Map();
  
  /**
   * Add a secret from an environment variable
   */
  addFromEnv(name: string, envVar: string, required: boolean = false): this {
    // Get the secret without throwing - we handle required check separately
    const value = getSecret(envVar, false);
    if (value !== undefined) {
      this.secrets.set(name, value);
      this.loadedFrom.set(name, `env:${envVar}`);
    } else if (required) {
      // If required and not found, we track that it was attempted
      this.loadedFrom.set(name, `env:${envVar} (required, not set)`);
    }
    return this;
  }
  
  /**
   * Add a secret from a file
   */
  addFromFile(name: string, filePath: string, keyInFile: string): this {
    const allSecrets = loadSecretsFromFile(filePath);
    const value = allSecrets[keyInFile];
    if (value !== undefined) {
      this.secrets.set(name, value);
      this.loadedFrom.set(name, `file:${path.basename(filePath)}:${keyInFile}`);
    }
    return this;
  }
  
  /**
   * Get a secret value
   */
  get(name: string): string | undefined {
    return this.secrets.get(name);
  }
  
  /**
   * Get a required secret (throws if missing)
   */
  getRequired(name: string): string {
    const value = this.secrets.get(name);
    if (value === undefined) {
      throw new Error(`Required secret ${name} is not loaded`);
    }
    return value;
  }
  
  /**
   * Check if a secret exists
   */
  has(name: string): boolean {
    return this.secrets.has(name);
  }
  
  /**
   * Get a masked version of a secret for logging
   */
  getMasked(name: string): string {
    const value = this.secrets.get(name);
    return maskSecret(value);
  }
  
  /**
   * Get debug info about loaded secrets (with masking)
   */
  getDebugInfo(): Record<string, string> {
    const info: Record<string, string> = {};
    for (const [name, value] of this.secrets.entries()) {
      info[name] = maskSecret(value);
    }
    return info;
  }
  
  /**
   * List all loaded secret names (without values)
   */
  listSecrets(): string[] {
    return Array.from(this.secrets.keys());
  }
  
  /**
   * Get the source of a secret
   */
  getSource(name: string): string | undefined {
    return this.loadedFrom.get(name);
  }
}

// Default instance for convenience
export const secrets = new SecretsManager();

// Helper to create a logger that masks secrets
export function createMaskedLogger(logger: {
  info: (msg: string, ...args: unknown[]) => void;
  warn: (msg: string, ...args: unknown[]) => void;
  error: (msg: string, ...args: unknown[]) => void;
}) {
  return {
    info: (msg: string, secrets: Record<string, string> = {}) => {
      const masked = Object.fromEntries(
        Object.entries(secrets).map(([k, v]) => [k, maskSecret(v)])
      );
      logger.info(msg, masked);
    },
    warn: (msg: string, secrets: Record<string, string> = {}) => {
      const masked = Object.fromEntries(
        Object.entries(secrets).map(([k, v]) => [k, maskSecret(v)])
      );
      logger.warn(msg, masked);
    },
    error: (msg: string, secrets: Record<string, string> = {}) => {
      const masked = Object.fromEntries(
        Object.entries(secrets).map(([k, v]) => [k, maskSecret(v)])
      );
      logger.error(msg, masked);
    },
  };
}
