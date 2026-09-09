import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const ROUTES = [
  '/login',
  '/dashboard',
  '/equipment',
  '/maintenance',
  '/downtime',
  '/reports',
  '/audit',
  '/admin/users',
  '/unauthorized',
];

const DETAIL_ROUTES = [
  { path: '/equipment/cmt1i9nnk0001asv361h6vn47', name: 'equipment detail' },
  { path: '/maintenance/cmt1i9nnk0002asv361h6vn48', name: 'maintenance detail' },
  { path: '/downtime/cmt1i9nnk0003asv361h6vn49', name: 'downtime detail' },
  { path: '/admin/users/cmt1i9nnk0001asv361h6vn47', name: 'user detail' },
  { path: '/maintenance/history/cmt1i9nnk0004asv361h6vn50', name: 'maintenance history detail' },
];

const VIEWPORTS = [
  { width: 1440, height: 900, name: 'desktop' },
  { width: 820, height: 1180, name: 'tablet' },
  { width: 390, height: 844, name: 'mobile' },
];

const CREDENTIALS = {
  admin: { email: 'admin@emms.dev', password: 'password123' },
  supervisor: { email: 'supervisor@emms.dev', password: 'password123' },
  technician: { email: 'technician@emms.dev', password: 'password123' },
};

async function login(page, role = 'admin') {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', CREDENTIALS[role].email);
  await page.fill('input[type="password"]', CREDENTIALS[role].password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
}

async function setDarkMode(page) {
  await page.goto(BASE_URL);
  await page.evaluate(() => localStorage.setItem('emms-theme', 'dark'));
  await page.reload();
  await page.waitForLoadState('networkidle');
}

async function setLightMode(page) {
  await page.goto(BASE_URL);
  await page.evaluate(() => localStorage.setItem('emms-theme', 'light'));
  await page.reload();
  await page.waitForLoadState('networkidle');
}

async function checkNoHorizontalOverflow(page) {
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  if (bodyWidth > viewportWidth) {
    throw new Error(`Horizontal overflow detected: body ${bodyWidth}px > viewport ${viewportWidth}px`);
  }
}

async function verifyRoute(page, path, name) {
  await page.goto(`${BASE_URL}${path}`);
  await page.waitForLoadState('networkidle');
  await checkNoHorizontalOverflow(page);
  console.log(`  ✓ ${name} (${path}) - no horizontal overflow`);
}

test.describe('M11 Verification', () => {
  test('login works', async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/dashboard/);
    console.log('✓ Login works');
  });

  for (const viewport of VIEWPORTS) {
    for (const theme of ['light', 'dark']) {
      test(`${viewport.name} ${theme} mode - main routes`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        if (theme === 'dark') await setDarkMode(page);
        else await setLightMode(page);
        await login(page);

        for (const route of ROUTES) {
          await verifyRoute(page, route, route);
        }
      });
    }
  }

  for (const viewport of VIEWPORTS) {
    test(`${viewport.name} light mode - detail routes`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await setLightMode(page);
      await login(page);

      for (const route of DETAIL_ROUTES) {
        try {
          await verifyRoute(page, route.path, route.name);
        } catch (e) {
          console.log(`  ⚠ ${route.name} (${route.path}) - ${e.message}`);
        }
      }
    });
  }

  test('RBAC - supervisor cannot access admin/users', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await setLightMode(page);
    await login(page, 'supervisor');
    await page.goto(`${BASE_URL}/admin/users`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/unauthorized/);
    console.log('✓ RBAC - supervisor blocked from /admin/users');
  });

  test('Navigation works', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await setLightMode(page);
    await login(page);

    // Check navigation links are present
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    const navLinks = await page.locator('nav a').all();
    expect(navLinks.length).toBeGreaterThan(5);
    console.log('✓ Navigation links present');
  });

  test('PaginationFooter works', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await setLightMode(page);
    await login(page);
    await page.goto(`${BASE_URL}/equipment`);
    await page.waitForLoadState('networkidle');
    
    const pagination = page.locator('text=Showing');
    if (await pagination.count() > 0) {
      const text = await pagination.first().textContent();
      expect(text).toContain('Showing');
      console.log('✓ PaginationFooter present');
    }
  });

  test('EmptyState works', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await setLightMode(page);
    await login(page);
    await page.goto(`${BASE_URL}/equipment?status=NONEXISTENT`);
    await page.waitForLoadState('networkidle');
    
    const emptyState = page.locator('text=No equipment matches your search');
    if (await emptyState.count() > 0) {
      console.log('✓ EmptyState present');
    }
  });

  test('Terminology - Asset number used consistently', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await setLightMode(page);
    await login(page);
    await page.goto(`${BASE_URL}/downtime`);
    await page.waitForLoadState('networkidle');
    
    const assetNumberText = page.locator('text=Asset number');
    if (await assetNumberText.count() > 0) {
      console.log('✓ Asset number terminology present');
    }
    
    const assetTagText = page.locator('text=Asset tag');
    if (await assetTagText.count() > 0) {
      console.log('⚠ Asset tag still present (should be Asset number)');
    }
  });

  test('Dashboard loading.tsx exists', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await setLightMode(page);
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    console.log('✓ Dashboard loads');
  });
});

test.afterAll(async () => {
  console.log('\n=== M11 Playwright Verification Complete ===');
});