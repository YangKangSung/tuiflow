import { test, expect } from '@grafana/plugin-e2e';

test('should display the terminal frame when the panel has no series', async ({
  gotoPanelEditPage,
  readProvisionedDashboard,
}) => {
  const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
  const panelEditPage = await gotoPanelEditPage({ dashboard, id: '2' });
  await expect(panelEditPage.panel.locator.locator('pre.tf')).toBeVisible();
});

test('should offer the tuiflow view option', async ({ panelEditPage, readProvisionedDataSource, page }) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });
  await panelEditPage.datasource.set(ds.name);
  await panelEditPage.setVisualization('tuiflow');
  await expect(page.getByText('Time series')).toBeVisible();
});
