#!/usr/bin/env ts-node

import { PowerBIExporter } from './export_all';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Test script to validate Power BI export functionality
 * This can be used to test the export with mock data when APIs are not available
 */

async function testExport() {
  console.log('🧪 Testing Power BI Export functionality...\n');

  try {
    // Test with localhost (default)
    const exporter = new PowerBIExporter('http://localhost:3001');
    
    console.log('Testing API connectivity...');
    
    // Check if output directory exists
    const outputDir = __dirname;
    console.log(`Output directory: ${outputDir}`);
    
    // Test the export
    await exporter.exportAll();
    
    // Validate generated files
    const expectedFiles = ['stations.csv', 'trains.csv', 'delay_summary.csv'];
    const missingFiles: string[] = [];
    
    console.log('\n🔍 Validating generated files...');
    
    for (const filename of expectedFiles) {
      const filePath = path.join(outputDir, filename);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const lines = fs.readFileSync(filePath, 'utf8').split('\n').length - 1;
        console.log(`✅ ${filename}: ${stats.size} bytes, ${lines} rows`);
      } else {
        missingFiles.push(filename);
        console.log(`❌ ${filename}: Missing`);
      }
    }
    
    if (missingFiles.length === 0) {
      console.log('\n🎉 All files generated successfully!');
      console.log('Ready for Power BI Desktop import.');
    } else {
      console.log(`\n⚠️  Missing files: ${missingFiles.join(', ')}`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.log('\n💡 Make sure your API server is running on http://localhost:3001');
    console.log('   Start it with: npm start');
    process.exit(1);
  }
}

// Run test if called directly
if (require.main === module) {
  testExport().catch(error => {
    console.error('Fatal test error:', error);
    process.exit(1);
  });
}

export { testExport };