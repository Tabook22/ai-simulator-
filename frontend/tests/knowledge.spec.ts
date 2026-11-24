import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const open = async (page: Page, part: string) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Knowledge structures' }).click();
  await page.getByTestId(`kl-part-${part}`).click();
  await expect(page.getByTestId(`kl-part-${part}`)).toHaveAttribute('aria-selected', 'true');
};

test('the knowledge structures lab has its own tab and seven parts', async ({ page }) => {
  await open(page, 'taxonomy');
  await expect(page.getByTestId('knowledge-lab')).toBeVisible();
  await expect(page.locator('.kl-rail [role="tab"]')).toHaveCount(7);
  await expect(page.getByTestId('kl-panel')).toContainText('What is a taxonomy?');
  await page.getByTestId('kl-next').click();
  await expect(page.getByTestId('kl-part-ontology')).toHaveAttribute('aria-selected', 'true');
  // The chosen part is remembered.
  await page.reload();
  await page.getByRole('button', { name: 'Knowledge structures' }).click();
  await expect(page.getByTestId('kl-part-ontology')).toHaveAttribute('aria-selected', 'true');
});

test('taxonomy: a heritage category narrows the archive search, and the course tree shows the path', async ({ page }) => {
  await open(page, 'taxonomy');
  await expect(page.getByTestId('kl-archive-count')).toContainText('Searching 2 of 8 sources');
  await page.getByTestId('kl-heritage-crafts').click();
  await expect(page.getByTestId('kl-archive-count')).toContainText('Searching 2 of 8 sources');
  await expect(page.getByTestId('kl-archive-count')).toContainText('Traditional crafts');
  await page.getByTestId('kl-heritage-heritage').click();
  await expect(page.getByTestId('kl-archive-count')).toContainText('Searching 8 of 8 sources');
  await page.getByTestId('kl-ask-proverbs').click();
  await expect(page.getByTestId('kl-archive').locator('li.in')).toHaveCount(2);

  await expect(page.getByTestId('kl-dhofar')).toContainText('Data Structures and Algorithms (COMP 201)');
  await page.getByTestId('kl-course-comp111').click();
  await expect(page.getByTestId('kl-course-path')).toContainText('Computer Science Courses → Programming Courses → COMP 111');
  await page.getByTestId('kl-add-course').click();
  await expect(page.getByTestId('kl-course-new')).toBeVisible();
  await expect(page.getByTestId('kl-course-path')).toContainText('A new programming course');
});

test('ontology: the four building blocks from the Dhofar University guide', async ({ page }) => {
  await open(page, 'ontology');
  await expect(page.getByTestId('kl-blocks').locator('.row:not(.head)')).toHaveCount(4);
  await expect(page.getByTestId('kl-block-relationship')).toContainText('COMP 201 requires COMP 151.');
  await expect(page.getByTestId('kl-block-rule')).toContainText('If a student passes COMP 151');
  await expect(page.getByTestId('kl-approach').locator('li')).toHaveCount(2);
});

test('how an ontology looks: arrows read as sentences, and the rule concludes only from facts', async ({ page }) => {
  await open(page, 'diagram');
  await page.getByTestId('kl-records-r-requires').click();
  await expect(page.getByTestId('kl-records-r-requires')).toHaveClass(/\bon\b/);
  await expect(page.getByTestId('kl-record-sentences').locator('button.on')).toHaveText('COMP 201 requires COMP 151.');
  await page.getByTestId('kl-schema-sentences').getByRole('button', { name: /loop on Course/ }).click();
  await expect(page.getByTestId('kl-schema-requires')).toHaveClass(/\bon\b/);

  await page.getByTestId('kl-apply').click();
  await expect(page.getByTestId('kl-conclusion')).toContainText('Maryam has met that prerequisite for COMP 201');
  await expect(page.getByTestId('kl-records-r-met')).toBeVisible();
  await page.getByTestId('kl-passed').uncheck();
  await expect(page.getByTestId('kl-conclusion')).toContainText('No conclusion');
  await expect(page.getByTestId('kl-records-r-met')).toHaveCount(0);
  await expect(page.getByTestId('kl-records-r-passed')).toHaveCount(0);
});

test('RDF triples: a paragraph becomes seven triples, they connect, and reasoning adds a fact', async ({ page }) => {
  await open(page, 'rdf');
  await expect(page.getByTestId('kr-triples').locator('button.row')).toHaveCount(7);
  await page.getByTestId('kr-triple-t5').click();
  await expect(page.getByTestId('kr-paragraph').locator('mark.on')).toHaveText(['a version', 'recorded in', 'Mirbat']);
  await page.getByTestId('kr-replay').click();
  await expect(page.getByTestId('kr-count')).toHaveText('0 of 7 statements');
  for (let i = 0; i < 7; i++) await page.getByTestId('kr-next-triple').click();
  await expect(page.getByTestId('kr-count')).toHaveText('7 of 7 statements');

  await page.getByTestId('kr-node-mirbat').click();
  await expect(page.getByTestId('kr-focus')).toContainText('Mirbat: subject of 1, object of 1');
  await expect(page.getByTestId('kr-turtle')).toContainText(':locatedWithin a owl:TransitiveProperty .');
  await expect(page.getByTestId('kr-edge-t8')).toHaveCount(0);
  await page.getByTestId('kr-run').click();
  await expect(page.getByTestId('kr-derived')).toContainText('Mirbat located within Oman');
  await expect(page.getByTestId('kr-edge-t8')).toHaveClass(/inferred/);
  await expect(page.getByTestId('kr-focus')).toContainText('Mirbat: subject of 2');
  await expect(page.getByTestId('kr-pipeline').locator('li')).toHaveCount(6);
});

test('knowledge graph, semantics and the overview', async ({ page }) => {
  await open(page, 'graph');
  await page.getByTestId('kn-query-made_of').click();
  await expect(page.locator('.kn-edge.on')).toHaveCount(3);
  await expect(page.getByTestId('kl-panel')).toContainText('(COMP201, requires, COMP151)');
  await page.getByTestId('kl-part-semantics').click();
  await expect(page.getByTestId('kn-semantics')).toContainText('heritage:Khanjar');
  await expect(page.getByTestId('kl-panel')).toContainText('What does “requires” mean?');
  await page.getByTestId('kl-part-together').click();
  await expect(page.getByTestId('knowledge-overview').locator('.kn-table .row:not(.head)')).toHaveCount(4);
  await expect(page.getByTestId('kn-ladder').locator('li')).toHaveCount(4);
  await expect(page.getByTestId('kn-summary')).toContainText('machine-readable');
});

test('the lab in Arabic', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'العربية' }).click();
  await page.getByRole('button', { name: 'هياكل المعرفة' }).click();
  await page.getByTestId('kl-part-taxonomy').click();
  await expect(page.getByTestId('kl-panel')).toContainText('ما التصنيف الهرمي؟');
  await expect(page.getByTestId('kl-dhofar')).toContainText('جامعة ظفار');
  await page.getByTestId('kl-part-diagram').click();
  await page.getByTestId('kl-apply').click();
  await expect(page.getByTestId('kl-conclusion')).toContainText('استوفت مريم');
  await page.getByTestId('kl-part-rdf').click();
  await expect(page.getByTestId('kl-panel')).toContainText('ما RDF؟');
  await page.getByTestId('kr-triple-t6').click();
  await expect(page.getByTestId('kr-paragraph').locator('mark.on')).toHaveText(['في مرباط', 'الواقعة في', 'ظفار']);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
