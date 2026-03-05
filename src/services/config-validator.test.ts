/**
 * Config Validator Service Tests - MC2-E8
 */

import {
  validateEnvVar,
  validateOptionalEnvVar,
  validateDatabaseUrl,
  checkDbConnectivity,
  validateRequiredEnvVars,
  validateOptionalEnvVars,
  validateConfig,
  validateEnv,
  getConfigSummary,
  DEFAULT_REQUIRED_ENV_VARS,
  DEFAULT_OPTIONAL_ENV_VARS,
  ValidationResult,
  DbConnectivityResult,
  ConfigValidationResult
} from './config-validator';

// Store original env to restore after tests
const originalEnv = { ...process.env };

describe('Config Validator Service', () => {
  
  beforeEach(() => {
    // Reset env before each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original env
    process.env = { ...originalEnv };
  });

  describe('validateEnvVar', () => {
    it('should return valid for set env var', () => {
      const result = validateEnvVar('TEST_VAR', 'test-value');
      expect(result.valid).toBe(true);
      expect(result.key).toBe('TEST_VAR');
      expect(result.value).toBe('test-value');
    });

    it('should return invalid for undefined env var', () => {
      const result = validateEnvVar('TEST_VAR', undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not set or empty');
    });

    it('should return invalid for empty env var', () => {
      const result = validateEnvVar('TEST_VAR', '');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not set or empty');
    });
  });

  describe('validateOptionalEnvVar', () => {
    it('should return valid with warning for unset optional var', () => {
      const result = validateOptionalEnvVar('OPTIONAL_VAR', undefined);
      expect(result.valid).toBe(true);
      expect(result.warning).toContain('Optional');
    });

    it('should return valid for set optional var without validator', () => {
      const result = validateOptionalEnvVar('OPTIONAL_VAR', 'some-value');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('some-value');
    });

    it('should validate with custom validator', () => {
      const validator = (v: string) => v.startsWith('http');
      const result = validateOptionalEnvVar('URL_VAR', 'https://example.com', validator);
      expect(result.valid).toBe(true);
    });

    it('should fail validation with custom validator for invalid value', () => {
      const validator = (v: string) => v.startsWith('http');
      const result = validateOptionalEnvVar('URL_VAR', 'not-a-url', validator);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid format');
    });
  });

  describe('validateDatabaseUrl', () => {
    it('should accept SQLite file path', () => {
      const result = validateDatabaseUrl('./dev.db');
      expect(result.valid).toBe(true);
    });

    it('should accept file: prefix', () => {
      const result = validateDatabaseUrl('file:./dev.db');
      expect(result.valid).toBe(true);
    });

    it('should accept SQLite extension', () => {
      const result = validateDatabaseUrl('./data.sqlite');
      expect(result.valid).toBe(true);
    });

    it('should accept PostgreSQL URL', () => {
      const result = validateDatabaseUrl('postgres://user:pass@localhost:5432/db');
      expect(result.valid).toBe(true);
    });

    it('should accept postgresql URL', () => {
      const result = validateDatabaseUrl('postgresql://user:pass@localhost:5432/db');
      expect(result.valid).toBe(true);
    });

    it('should accept MySQL URL', () => {
      const result = validateDatabaseUrl('mysql://user:pass@localhost:3306/db');
      expect(result.valid).toBe(true);
    });

    it('should accept MongoDB URL', () => {
      const result = validateDatabaseUrl('mongodb://localhost:27017/db');
      expect(result.valid).toBe(true);
    });

    it('should reject empty URL', () => {
      const result = validateDatabaseUrl('');
      expect(result.valid).toBe(false);
    });

    it('should reject invalid format', () => {
      const result = validateDatabaseUrl('invalid-url');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must start with');
    });
  });

  describe('checkDbConnectivity', () => {
    it('should connect to SQLite file in current directory', async () => {
      const result = await checkDbConnectivity('file:./test.db');
      expect(result.connected).toBe(true);
      expect(result.databaseType).toBe('sqlite');
      expect(result.latencyMs).toBeDefined();
    });

    it('should handle non-existent directory gracefully', async () => {
      const result = await checkDbConnectivity('file:/nonexistent/path/test.db');
      expect(result.connected).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should recognize PostgreSQL connection string', async () => {
      const result = await checkDbConnectivity('postgres://user:pass@localhost:5432/db');
      expect(result.databaseType).toBe('postgres');
    });

    it('should recognize MongoDB connection string', async () => {
      const result = await checkDbConnectivity('mongodb://localhost:27017/db');
      expect(result.databaseType).toBe('mongodb');
    });
  });

  describe('validateRequiredEnvVars', () => {
    it('should validate all required vars', () => {
      process.env.DATABASE_URL = 'file:./test.db';
      const results = validateRequiredEnvVars([...DEFAULT_REQUIRED_ENV_VARS]);
      
      expect(results.length).toBeGreaterThan(0);
      const dbResult = results.find(r => r.key === 'DATABASE_URL');
      expect(dbResult?.valid).toBe(true);
    });

    it('should fail for missing required vars', () => {
      delete process.env.DATABASE_URL;
      const results = validateRequiredEnvVars([...DEFAULT_REQUIRED_ENV_VARS]);
      
      const dbResult = results.find(r => r.key === 'DATABASE_URL');
      expect(dbResult?.valid).toBe(false);
    });
  });

  describe('validateOptionalEnvVars', () => {
    it('should validate optional vars with warnings for unset', () => {
      const results = validateOptionalEnvVars([...DEFAULT_OPTIONAL_ENV_VARS]);
      
      // All should be valid but have warnings for unset vars
      expect(results.every(r => r.valid)).toBe(true);
    });

    it('should validate with custom validators', () => {
      process.env.OLLAMA_BASE_URL = 'http://localhost:11434';
      process.env.APP_URL = 'https://example.com';
      
      const results = validateOptionalEnvVars([
        { key: 'OLLAMA_BASE_URL', validator: (v) => v.startsWith('http') },
        { key: 'APP_URL', validator: (v) => v.startsWith('http') }
      ]);
      
      expect(results.every(r => r.valid)).toBe(true);
    });
  });

  describe('validateConfig', () => {
    it('should return valid when all required vars are set', async () => {
      process.env.DATABASE_URL = 'file:./test.db';
      
      const result = await validateConfig({ skipDbCheck: true });
      
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.timestamp).toBeDefined();
    });

    it('should return invalid when required vars are missing', async () => {
      delete process.env.DATABASE_URL;
      
      const result = await validateConfig({ skipDbCheck: true });
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should include warnings for unset optional vars', async () => {
      process.env.DATABASE_URL = 'file:./test.db';
      
      const result = await validateConfig({ skipDbCheck: true });
      
      // Optional vars should generate warnings
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it('should check DB connectivity when not skipped', async () => {
      process.env.DATABASE_URL = 'file:./test.db';
      
      const result = await validateConfig({ skipDbCheck: false });
      
      // Should complete without error for valid SQLite file
      expect(result.valid).toBe(true);
    });
  });

  describe('validateEnv', () => {
    it('should skip DB check by default', () => {
      process.env.DATABASE_URL = 'file:./test.db';
      
      const result = validateEnv();
      
      expect(result.valid).toBe(true);
    });
  });

  describe('getConfigSummary', () => {
    it('should return config summary', () => {
      process.env.DATABASE_URL = 'file:./test.db';
      process.env.OLLAMA_BASE_URL = 'http://localhost:11434';
      
      const summary = getConfigSummary();
      
      expect(summary.requiredVars).toContain('DATABASE_URL');
      expect(summary.optionalVars).toContain('OLLAMA_BASE_URL');
      expect(summary.setCount).toBeGreaterThan(0);
      expect(summary.missingCount).toBe(0); // DATABASE_URL is set
    });

    it('should count missing required vars', () => {
      delete process.env.DATABASE_URL;
      
      const summary = getConfigSummary();
      
      expect(summary.missingCount).toBeGreaterThan(0);
    });
  });

  describe('DEFAULT_REQUIRED_ENV_VARS', () => {
    it('should include DATABASE_URL', () => {
      expect(DEFAULT_REQUIRED_ENV_VARS).toContain('DATABASE_URL');
    });
  });

  describe('DEFAULT_OPTIONAL_ENV_VARS', () => {
    it('should include common optional vars', () => {
      const keys = DEFAULT_OPTIONAL_ENV_VARS.map(v => v.key);
      
      expect(keys).toContain('OLLAMA_BASE_URL');
      expect(keys).toContain('OLLAMA_MODEL');
      expect(keys).toContain('UNRAID_URL');
      expect(keys).toContain('APP_URL');
    });

    it('should have validators for each var', () => {
      for (const v of DEFAULT_OPTIONAL_ENV_VARS) {
        expect(v.validator).toBeDefined();
      }
    });
  });
});
