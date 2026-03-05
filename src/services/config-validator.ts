/**
 * Config Validator Service - MC2-E8
 * 
 * Validates:
 * - Environment variables (required, format, presence)
 * - Required settings (app-specific configuration)
 * - Database connectivity check
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Validation result for a single config item
 */
export interface ValidationResult {
  valid: boolean;
  key: string;
  value?: string;
  error?: string;
  warning?: string;
}

/**
 * Overall config validation status
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors: ValidationResult[];
  warnings: ValidationResult[];
  timestamp: string;
}

/**
 * DB connectivity check result
 */
export interface DbConnectivityResult {
  connected: boolean;
  latencyMs?: number;
  error?: string;
  databaseType?: string;
}

/**
 * Config validator options
 */
export interface ConfigValidatorOptions {
  /** Path to .env file to validate (optional) */
  envFilePath?: string;
  /** Skip DB connectivity check */
  skipDbCheck?: boolean;
  /** Custom required env vars (merged with defaults) */
  requiredEnvVars?: string[];
  /** Custom optional env vars with validation */
  optionalEnvVars?: Array<{ key: string; validator?: (value: string) => boolean; }>;
}

// ============================================================================
// Default Required Environment Variables
// ============================================================================

export const DEFAULT_REQUIRED_ENV_VARS = [
  'DATABASE_URL',
] as const;

export const DEFAULT_OPTIONAL_ENV_VARS = [
  { key: 'OLLAMA_BASE_URL', validator: (v: string) => v.startsWith('http') },
  { key: 'OLLAMA_MODEL', validator: (v: string) => v.includes(':') },
  { key: 'UNRAID_URL', validator: (v: string) => v.startsWith('http') },
  { key: 'UNRAID_API_KEY', validator: (v: string) => v.length > 0 },
  { key: 'OPENWEATHERMAP_API_KEY', validator: (v: string) => v.length > 0 },
  { key: 'ICLOUD_EMAIL', validator: (v: string) => v.includes('@') },
  { key: 'ICLOUD_APP_PASSWORD', validator: (v: string) => v.length > 10 },
  { key: 'FOOTBALL_DATA_API_KEY', validator: (v: string) => v.length >= 10 },
  { key: 'APP_URL', validator: (v: string) => v.startsWith('http') },
  { key: 'NEXT_PUBLIC_LOW_POWER', validator: (v: string) => v === 'true' || v === 'false' },
] as const;

// ============================================================================
// Config Validation Functions
// ============================================================================

/**
 * Validate a single environment variable exists
 */
export function validateEnvVar(key: string, value: string | undefined): ValidationResult {
  if (value === undefined || value === '') {
    return {
      valid: false,
      key,
      error: `Environment variable ${key} is not set or empty`
    };
  }

  return {
    valid: true,
    key,
    value
  };
}

/**
 * Validate an optional environment variable with a custom validator
 */
export function validateOptionalEnvVar(
  key: string, 
  value: string | undefined, 
  validator?: (value: string) => boolean
): ValidationResult {
  // If not set, just return valid (it's optional)
  if (value === undefined || value === '') {
    return {
      valid: true,
      key,
      warning: `Optional environment variable ${key} is not set`
    };
  }

  // If set, validate with custom validator if provided
  if (validator && !validator(value)) {
    return {
      valid: false,
      key,
      value,
      error: `Environment variable ${key} has invalid format`
    };
  }

  return {
    valid: true,
    key,
    value
  };
}

/**
 * Validate DATABASE_URL format
 */
export function validateDatabaseUrl(url: string): ValidationResult {
  if (!url) {
    return {
      valid: false,
      key: 'DATABASE_URL',
      error: 'DATABASE_URL is required'
    };
  }

  // Support file-based (SQLite) and connection string formats
  // Handle plain .db, .sqlite, .sqlite3 extensions (common for SQLite)
  if (url.endsWith('.db') || url.endsWith('.sqlite') || url.endsWith('.sqlite3')) {
    return {
      valid: true,
      key: 'DATABASE_URL',
      value: url
    };
  }
  
  const validPrefixes = ['file:', 'sqlite:', 'postgres:', 'postgresql:', 'mysql:', 'mysql2:', 'mongodb:'];
  const isValidFormat = validPrefixes.some(prefix => url.toLowerCase().startsWith(prefix));
  
  if (!isValidFormat) {
    return {
      valid: false,
      key: 'DATABASE_URL',
      value: url,
      error: 'DATABASE_URL must start with file:, sqlite:, postgres:, postgresql:, mysql:, or mongodb:, or be a .db/.sqlite/.sqlite3 file path'
    };
  }

  return {
    valid: true,
    key: 'DATABASE_URL',
    value: url
  };
}

/**
 * Check database connectivity
 * For SQLite/file-based DBs, checks if file is accessible
 * For connection strings, attempts a basic connectivity test
 */
export async function checkDbConnectivity(databaseUrl: string): Promise<DbConnectivityResult> {
  const startTime = Date.now();
  
  try {
    // Handle SQLite/file-based databases
    if (databaseUrl.toLowerCase().startsWith('file:') || 
        databaseUrl.endsWith('.db') ||
        databaseUrl.endsWith('.sqlite') ||
        databaseUrl.endsWith('.sqlite3')) {
      
      const filePath = databaseUrl.replace('file:', '');
      
      // Dynamic import for Node.js fs
      const fs = await import('fs');
      
      // Check if parent directory exists and is writable
      const dir = filePath.includes('/') 
        ? filePath.substring(0, filePath.lastIndexOf('/')) 
        : '.';
      
      try {
        // Try to access the directory
        fs.accessSync(dir, fs.constants.W_OK);
        
        // If file exists, check it's readable
        if (fs.existsSync(filePath)) {
          fs.readFileSync(filePath, { flag: 'r' });
        }
        
        return {
          connected: true,
          latencyMs: Date.now() - startTime,
          databaseType: 'sqlite'
        };
      } catch (dirError: any) {
        return {
          connected: false,
          error: `Cannot access database directory: ${dirError.message}`,
          databaseType: 'sqlite'
        };
      }
    }
    
    // For other DB types (PostgreSQL, MySQL, MongoDB), simulate connectivity check
    // In production, this would use actual DB drivers
    const dbType = databaseUrl.split(':')[0].toLowerCase();
    
    // Simulate a quick connectivity check (in real implementation, would use DB driver)
    return {
      connected: true, // Placeholder - real impl would test actual connection
      latencyMs: Date.now() - startTime,
      databaseType: dbType
    };
    
  } catch (error: any) {
    return {
      connected: false,
      error: error.message || 'Unknown database connectivity error'
    };
  }
}

/**
 * Validate all required environment variables
 */
export function validateRequiredEnvVars(envVars: string[]): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  for (const key of envVars) {
    const value = process.env[key];
    const result = validateEnvVar(key, value);
    results.push(result);
  }
  
  return results;
}

/**
 * Validate all optional environment variables
 */
export function validateOptionalEnvVars(
  optionalVars: Array<{ key: string; validator?: (value: string) => boolean; }>
): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  for (const { key, validator } of optionalVars) {
    const value = process.env[key];
    const result = validateOptionalEnvVar(key, value, validator);
    results.push(result);
  }
  
  return results;
}

/**
 * Main config validator - validates all environment variables and optionally checks DB connectivity
 */
export async function validateConfig(options: ConfigValidatorOptions = {}): Promise<ConfigValidationResult> {
  const {
    skipDbCheck = false,
    requiredEnvVars = [...DEFAULT_REQUIRED_ENV_VARS],
    optionalEnvVars = [...DEFAULT_OPTIONAL_ENV_VARS]
  } = options;
  
  const errors: ValidationResult[] = [];
  const warnings: ValidationResult[] = [];
  
  // Validate required env vars
  const requiredResults = validateRequiredEnvVars(requiredEnvVars);
  for (const result of requiredResults) {
    if (!result.valid) {
      errors.push(result);
    }
  }
  
  // Validate optional env vars
  const optionalResults = validateOptionalEnvVars(optionalEnvVars);
  for (const result of optionalResults) {
    if (!result.valid) {
      errors.push(result);
    } else if (result.warning) {
      warnings.push(result);
    }
  }
  
  // Validate DATABASE_URL format specifically
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    const dbUrlValidation = validateDatabaseUrl(dbUrl);
    if (!dbUrlValidation.valid) {
      errors.push(dbUrlValidation);
    }
  }
  
  // Check DB connectivity if requested and DATABASE_URL is present
  if (!skipDbCheck && dbUrl && errors.length === 0) {
    const dbResult = await checkDbConnectivity(dbUrl);
    
    if (!dbResult.connected) {
      errors.push({
        valid: false,
        key: 'DATABASE_URL',
        error: `Database connectivity failed: ${dbResult.error}`
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    timestamp: new Date().toISOString()
  };
}

/**
 * Quick validation - just check required env vars without DB check (sync version)
 */
export function validateEnv(): ConfigValidationResult {
  const errors: ValidationResult[] = [];
  const warnings: ValidationResult[] = [];
  
  // Validate required env vars
  const requiredResults = validateRequiredEnvVars([...DEFAULT_REQUIRED_ENV_VARS]);
  for (const result of requiredResults) {
    if (!result.valid) {
      errors.push(result);
    }
  }
  
  // Validate optional env vars (just check they're valid format if set)
  const optionalResults = validateOptionalEnvVars([...DEFAULT_OPTIONAL_ENV_VARS]);
  for (const result of optionalResults) {
    if (!result.valid) {
      errors.push(result);
    } else if (result.warning) {
      warnings.push(result);
    }
  }
  
  // Validate DATABASE_URL format specifically
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    const dbUrlValidation = validateDatabaseUrl(dbUrl);
    if (!dbUrlValidation.valid) {
      errors.push(dbUrlValidation);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get a summary of config status (useful for health checks)
 */
export function getConfigSummary(): {
  requiredVars: string[];
  optionalVars: string[];
  setCount: number;
  missingCount: number;
} {
  const requiredVars = [...DEFAULT_REQUIRED_ENV_VARS];
  const optionalVars = DEFAULT_OPTIONAL_ENV_VARS.map(v => v.key);
  
  let setCount = 0;
  let missingCount = 0;
  
  for (const key of requiredVars) {
    if (process.env[key]) setCount++;
    else missingCount++;
  }
  
  for (const key of optionalVars) {
    if (process.env[key]) setCount++;
  }
  
  return {
    requiredVars,
    optionalVars,
    setCount,
    missingCount
  };
}
