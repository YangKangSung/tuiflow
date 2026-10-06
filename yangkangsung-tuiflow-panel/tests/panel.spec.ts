import { test, expect } from '@grafana/plugin-e2e';

test('should display "no data" when the query returns nothing', async ({ gotoPanelEditPage, readProvisionedDashboard }) => {
  const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
  const panelEditPage = await gotoPanelEditPage({ dashboard, id: '2' });
  await expect(panelEditPage.panel.locator).toContainText('no data');
});

test('should render the TUI chart when series are passed', async ({
  panelEditPage,
  readProvisionedDataSource,
  page,
}) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });
  await panelEditPage.datasource.set(ds.name);
  await panelEditPage.setVisualization('Tuiflow');
  await expect(page.getByTestId('tuiflow-panel')).toBeVisible();
  await expect(page.locator('.tf')).toBeVisible();
});

test('should switch visualization from the panel options', async ({ gotoPanelEditPage, readProvisionedDashboard, page }) => {
  const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
  const panelEditPage = await gotoPanelEditPage({ dashboard, id: '1' });
  const options = panelEditPage.getCustomOptions('Tuiflow');
  await options.getSelect('Visualization').selectOption('Stat');
  await expect(page.getByTestId('tuiflow-panel')).toBeVisible();
});
