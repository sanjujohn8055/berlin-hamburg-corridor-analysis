import { Pool, PoolClient, QueryResult } from 'pg';
import { Logger } from '../utils/Logger';

/**
 * Database service for PostgreSQL with PostGIS support
 */
export class DatabaseService {
  private pool: Pool;
  private logger = Logger.getInstance();

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      this.logger.error('Unexpected error on idle client', err);
    });
  }

  /**
   * Execute a query with optional parameters
   */
  async query(text: string, params?: any[]): Promise<QueryResult> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      this.logger.debug('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      this.logger.error('Database query error', { text, params, error });
      throw error;
    }
  }

  /**
   * Get a client from the pool for transactions
   */
  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  /**
   * Execute multiple queries in a transaction
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      this.logger.info('Database connection successful');
      return true;
    } catch (error) {
      this.logger.error('Database connection failed:', error);
      return false;
    }
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    await this.pool.end();
    this.logger.info('Database connections closed');
  }
}