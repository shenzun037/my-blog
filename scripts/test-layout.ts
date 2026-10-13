import { Story } from '../src/types/journal';
import { INITIAL_STORIES } from '../src/constants/initialData';

console.log('Testing Editorial Mosaic Layout Logic...\n');

// Mock stories of different types
function createMockStories(count: number, options: { onlyText?: boolean; onlyPhotos?: boolean; featuredAt?: number } = {}): Story[] {
  const result: Story[] = [];
  for (let i = 0; i < count; i++) {
    const isPhoto = options.onlyPhotos ? true : options.onlyText ? false : i % 2 === 0;
    result.push({
      id: `mock-${i + 1}`,
      slug: `mock-story-${i + 1}`,
      title: { en: `Mock Story ${i + 1}`, th: `เรื่องจำลอง ${i + 1}` },
      excerpt: { en: `Excerpt for mock story ${i + 1}`, th: `บทคัดย่อสำหรับเรื่องจำลอง ${i + 1}` },
      type: isPhoto ? 'photo' : 'quote',
      mood: 'peaceful',
      themeId: 'nature',
      date: 'Apr 12, 2025',
      coverImage: isPhoto ? `/images/mock-${i + 1}.jpg` : undefined,
      overlayQuote: !isPhoto ? { en: `Quote for story ${i + 1}`, th: `คำคม ${i + 1}` } : undefined,
      tags: ['Test'],
      category: isPhoto ? 'Photography' : 'Thoughts',
      isFeatured: options.featuredAt === i,
      isPublished: true,
      readingTimeMinutes: 2,
      createdAt: '2025-04-12T14:30:00Z',
      updatedAt: '2025-04-12T14:30:00Z',
      contentBlocks: [],
    });
  }
  return result;
}

// Simulate partitioning algorithm from EditorialMosaic
function partitionStories(stories: Story[]) {
  const imageStoryCount = stories.filter((s) => !!s.coverImage).length;
  const isPredominantlyText = imageStoryCount === 0 || imageStoryCount / stories.length < 0.25;

  if (isPredominantlyText) {
    return { mode: 'text', partitions: [stories.length] };
  }

  if (stories.length <= 3) {
    return { mode: 'small', partitions: [stories.length] };
  }

  const partitions: string[] = [];
  let index = 0;
  let clusterCount = 0;

  while (index < stories.length) {
    const remaining = stories.length - index;

    if (remaining >= 5 || remaining === 3) {
      partitions.push(`LeadMosaic(3)[${clusterCount % 2 === 0 ? 'LeadLeft' : 'LeadRight'}]`);
      index += 3;
      clusterCount++;
      continue;
    }

    if (remaining === 4) {
      partitions.push('Quartet(4)');
      index += 4;
      continue;
    }

    if (remaining === 2) {
      partitions.push('Duo(2)');
      index += 2;
      continue;
    }

    if (remaining === 1) {
      partitions.push('SingleWide(1)');
      index += 1;
      continue;
    }
  }

  return { mode: 'mosaic', partitions, totalCovered: index };
}

let allPass = true;

// Test 1: Single Story
const p1 = partitionStories(createMockStories(1));
console.log('Test 1 (Count=1):', p1);
if (p1.partitions[0] !== 1) allPass = false;

// Test 2: Two Stories
const p2 = partitionStories(createMockStories(2));
console.log('Test 2 (Count=2):', p2);
if (p2.partitions[0] !== 2) allPass = false;

// Test 3: Three Stories
const p3 = partitionStories(createMockStories(3));
console.log('Test 3 (Count=3):', p3);
if (p3.partitions[0] !== 3) allPass = false;

// Test 4: Counts from 4 to 20
for (let c = 4; c <= 20; c++) {
  const res = partitionStories(createMockStories(c, { onlyPhotos: true }));
  const covered = res.totalCovered;
  const pass = covered === c;
  if (!pass) allPass = false;
  console.log(`Test Count=${c}: covered=${covered}/${c} | clusters=[${res.partitions?.join(' -> ')}] | ${pass ? '✅ PASS' : '❌ FAIL'}`);
}

// Test 5: Predominantly text stories (e.g. Thoughts & Quotes)
const textRes = partitionStories(createMockStories(8, { onlyText: true }));
console.log('\nTest Predominantly Text (Count=8):', textRes);
if (textRes.mode !== 'text' || textRes.partitions[0] !== 8) allPass = false;

// Test 6: Screenshot 2 scenario (1 featured large photo + 2 small text cards)
const screen2Res = partitionStories(createMockStories(3, { featuredAt: 0 }));
console.log('\nTest Screenshot 2 Scenario (1 large featured + 2 text cards):', screen2Res);

// Test 7: Real Initial Stories
const initialRes = partitionStories(INITIAL_STORIES);
console.log(`\nTest INITIAL_STORIES (Count=${INITIAL_STORIES.length}): covered=${initialRes.totalCovered}/${INITIAL_STORIES.length} | clusters=[${initialRes.partitions?.join(' -> ')}]`);
if (initialRes.totalCovered !== INITIAL_STORIES.length) allPass = false;

if (allPass) {
  console.log('\n🎉 ALL EDITORIAL MOSAIC PARTITIONING CHECKS PASSED PERFECTLY!');
  process.exit(0);
} else {
  console.error('\n❌ SOME LAYOUT PARTITIONING CHECKS FAILED!');
  process.exit(1);
}
