import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Sprint Fetch Behavior', () => {
  test.beforeEach(async () => {
    // Clean up any existing sprint files in root before each test
    const rootFiles = fs.readdirSync('../../').filter(file => 
      file.startsWith('wtci-sprint-tickets-') && file.endsWith('.txt')
    );
    rootFiles.forEach(file => {
      try {
        fs.unlinkSync(`../../${file}`);
        console.log(`🧹 Cleaned up root file: ${file}`);
      } catch (error) {
        console.log(`⚠️ Could not clean up ${file}:`, error.message);
      }
    });
  });

  test('should create files in fetched folder, not root directory', async ({ request }) => {
    console.log('🧪 Testing Sprint Fetch Behavior\n');

    // Test 1: Check initial state - no sprint files in root
    console.log('1️⃣ Checking initial state...');
    const rootFiles = fs.readdirSync('../../').filter(file => 
      file.startsWith('wtci-sprint-tickets-') && file.endsWith('.txt')
    );
    console.log(`   Root directory sprint files: ${rootFiles.length}`);
    expect(rootFiles.length).toBe(0);
    console.log('   ✅ No sprint files in root directory');

    // Test 2: Check fetched folder
    console.log('\n2️⃣ Checking fetched folder...');
    const fetchedPath = path.join('../../', 'sprintData', 'fetched');
    expect(fs.existsSync(fetchedPath)).toBe(true);
    
    const fetchedFiles = fs.readdirSync(fetchedPath).filter(file => 
      file.startsWith('wtci-sprint-tickets-') && file.endsWith('.txt')
    );
    console.log(`   Fetched folder sprint files: ${fetchedFiles.length}`);
    if (fetchedFiles.length > 0) {
      console.log('   ✅ Found sprint files in fetched folder:', fetchedFiles);
    } else {
      console.log('   ℹ️ No sprint files in fetched folder');
    }

    // Test 3: Make API call to fetch sprint data
    console.log('\n3️⃣ Testing API call...');
    const response = await request.get('/api/fetch-sprint');
    expect(response.ok()).toBeTruthy();
    console.log(`   API Response Status: ${response.status()}`);

    const responseData = await response.json();
    console.log(`   ✅ Sprint fetched: ${responseData.sprintName}`);
    console.log(`   📁 Filename: ${responseData.fileInfo?.filename || 'Unknown'}`);
    console.log(`   📍 Path: ${responseData.fileInfo?.path || 'Unknown'}`);

    // Test 4: Verify file was created in correct location
    console.log('\n4️⃣ Verifying file location after API call...');

    // Check root again
    const rootFilesAfter = fs.readdirSync('../../').filter(file => 
      file.startsWith('wtci-sprint-tickets-') && file.endsWith('.txt')
    );
    console.log(`   Root directory sprint files after API call: ${rootFilesAfter.length}`);
    expect(rootFilesAfter.length).toBe(0);
    console.log('   ✅ No sprint files created in root directory');

    // Check fetched folder again
    const fetchedFilesAfter = fs.readdirSync(fetchedPath).filter(file => 
      file.startsWith('wtci-sprint-tickets-') && file.endsWith('.txt')
    );
    console.log(`   Fetched folder sprint files after API call: ${fetchedFilesAfter.length}`);
    expect(fetchedFilesAfter.length).toBeGreaterThan(0);
    console.log('   ✅ Sprint files found in fetched folder:', fetchedFilesAfter);

    // Final result
    console.log('\n🎯 Test Results:');
    console.log('   ✅ SUCCESS: Files are created in fetched folder, not root');
  });

  test('should use sprint date for filename instead of current date', async ({ request }) => {
    console.log('🧪 Testing Sprint Date Filename\n');

    // Make API call to fetch sprint data
    const response = await request.get('/api/fetch-sprint');
    expect(response.ok()).toBeTruthy();

    const responseData = await response.json();
    const filename = responseData.fileInfo?.filename;
    
    console.log(`📁 Generated filename: ${filename}`);
    
    // Check if filename contains sprint date pattern (YYYY-MM-DD)
    const sprintDateMatch = filename?.match(/wtci-sprint-tickets-(\d{4}-\d{2}-\d{2})\.txt/);
    expect(sprintDateMatch).toBeTruthy();
    
    const sprintDate = sprintDateMatch![1];
    console.log(`📅 Sprint date in filename: ${sprintDate}`);
    
    // Verify it's not today's date
    const today = new Date().toISOString().split('T')[0];
    expect(sprintDate).not.toBe(today);
    console.log(`✅ Filename uses sprint date (${sprintDate}), not current date (${today})`);
  });

  test('should handle duplicate files in fetched folder', async ({ request }) => {
    console.log('🧪 Testing Duplicate File Handling\n');

    // First API call
    console.log('1️⃣ First API call...');
    const response1 = await request.get('/api/fetch-sprint');
    expect(response1.ok()).toBeTruthy();
    const data1 = await response1.json();
    console.log(`   ✅ First call successful: ${data1.sprintName}`);

    // Second API call (should replace the file)
    console.log('\n2️⃣ Second API call (duplicate)...');
    const response2 = await request.get('/api/fetch-sprint');
    expect(response2.ok()).toBeTruthy();
    const data2 = await response2.json();
    console.log(`   ✅ Second call successful: ${data2.sprintName}`);

    // Verify only one file exists in fetched folder
    const fetchedPath = path.join('../../', 'sprintData', 'fetched');
    const fetchedFiles = fs.readdirSync(fetchedPath).filter(file => 
      file.startsWith('wtci-sprint-tickets-') && file.endsWith('.txt')
    );
    
    expect(fetchedFiles.length).toBe(1);
    console.log(`   ✅ Only one file in fetched folder: ${fetchedFiles[0]}`);
  });
});
