import { test, expect } from '@playwright/test';

test.describe('API Endpoints', () => {
  test('should respond to health check', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status', 'OK');
    expect(data).toHaveProperty('message', 'Server is running');
  });

  test('should fetch sprint data', async ({ request }) => {
    const response = await request.get('/api/fetch-sprint');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('sprintName');
    expect(data).toHaveProperty('ticketCount');
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('tickets');
    expect(Array.isArray(data.tickets)).toBe(true);
  });

  test('should return proper sprint data structure', async ({ request }) => {
    const response = await request.get('/api/fetch-sprint');
    const data = await response.json();
    
    // Verify sprint data structure
    expect(data.sprintName).toMatch(/WTCI Sprint/);
    expect(typeof data.ticketCount).toBe('number');
    expect(data.ticketCount).toBeGreaterThan(0);
    expect(data.status).toBe('Active');
    expect(data.tickets.length).toBe(data.ticketCount);
    
    // Verify ticket structure
    if (data.tickets.length > 0) {
      const ticket = data.tickets[0];
      expect(ticket).toHaveProperty('key');
      expect(ticket).toHaveProperty('summary');
      expect(ticket).toHaveProperty('status');
      expect(ticket.key).toMatch(/WTCI-\d+/);
    }
  });

  test('should handle sprint files endpoint', async ({ request }) => {
    const response = await request.get('/api/check-existing-files?filename=test.txt');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('exists');
    expect(data).toHaveProperty('locations');
    expect(Array.isArray(data.locations)).toBe(true);
  });

  test('should handle file content requests', async ({ request }) => {
    // Test file content request with a known filename
    const contentResponse = await request.get('/api/file-content?filename=wtci-sprint-tickets-2025-09-25.txt&folder=fetched');
    
    // This might return 200 or 404 depending on file existence
    expect([200, 404]).toContain(contentResponse.status());
    
    if (contentResponse.status() === 200) {
      const contentData = await contentResponse.json();
      expect(contentData).toHaveProperty('content');
      expect(typeof contentData.content).toBe('string');
    }
  });

  test('should handle move to inprogress endpoint', async ({ request }) => {
    // First get sprint data to get filename
    const sprintResponse = await request.get('/api/fetch-sprint');
    const sprintData = await sprintResponse.json();
    
    if (sprintData.fileInfo && sprintData.fileInfo.filename) {
      const response = await request.post('/api/move-to-inprogress', {
        data: {
          filename: sprintData.fileInfo.filename
        }
      });
      
      // This endpoint might return 200 or 404 depending on file state
      expect([200, 404]).toContain(response.status());
    }
  });

  test('should handle CORS headers', async ({ request }) => {
    const response = await request.get('/api/health');
    
    expect(response.headers()['access-control-allow-origin']).toBe('*');
    expect(response.headers()['access-control-allow-methods']).toContain('GET');
    expect(response.headers()['access-control-allow-methods']).toContain('POST');
  });

  test('should handle OPTIONS requests', async ({ request }) => {
    const response = await request.fetch('/api/fetch-sprint', { method: 'OPTIONS' });
    expect(response.status()).toBe(200);
    
    expect(response.headers()['access-control-allow-origin']).toBe('*');
    expect(response.headers()['access-control-allow-methods']).toContain('GET');
    expect(response.headers()['access-control-allow-methods']).toContain('POST');
  });

  test('should return consistent data format', async ({ request }) => {
    // Make multiple requests to ensure consistency
    const responses = await Promise.all([
      request.get('/api/fetch-sprint'),
      request.get('/api/fetch-sprint'),
      request.get('/api/fetch-sprint')
    ]);
    
    const dataSets = await Promise.all(
      responses.map(response => response.json())
    );
    
    // All responses should have the same structure
    dataSets.forEach(data => {
      expect(data).toHaveProperty('sprintName');
      expect(data).toHaveProperty('ticketCount');
      expect(data).toHaveProperty('tickets');
    });
  });

  test('should handle invalid endpoints gracefully', async ({ request }) => {
    const response = await request.get('/api/invalid-endpoint');
    expect(response.status()).toBe(404);
  });

  test('should handle malformed requests', async ({ request }) => {
    // Test with invalid parameters
    const response = await request.get('/api/file-content?filename=&folder=');
    expect(response.status()).toBe(400);
  });
});
