import { Story, SiteSettings } from '../types/journal';

export const INITIAL_SETTINGS: SiteSettings = {
  title: 'SHENZUN',
  subtitleEn: 'A quieter place for a noisier mind.',
  subtitleTh: 'พื้นที่ที่สงบๆ สำหรับใจที่วุ่นวาย',
  wordmark: "Shenzun's blog",
  kickerEn: 'A JOURNAL OF ORDINARY MAGIC',
  kickerTh: 'บันทึกของความมหัศจรรย์ในวันธรรมดา',
  bioEn: 'I sit quietly in a corner, my mind crowded with countless thoughts. And you know what? I’m afraid that one day, they might find their way out of my head.',
  bioTh: 'ผมนั่งเงียบๆอยู่ที่มุมหนึ่งในหัวกำลังคิดบางอย่างมากมายแล้วคุณรู้ไหมผมเองกลัวว่าสักวันมันจะออกมาจากความคิดของผม',
  defaultLanguage: 'en',
  defaultTheme: 'dreamy',
  musicLibrary: [],
  socialLinks: {
    instagram: 'https://instagram.com/shenzun037',
    github: 'https://github.com/shenzun037',
    discord: 'https://discord.gg/TvUJDZMvJP',
    email: 'shenzun037@gmail.com',
  },
  principlesEn: [
    'If you feel that the world has lost all its beauty,',
    'and death has become one of the things you yearn for,',
    'first, try putting on a pair of glasses and gazing far into the open sky',
    'Second, drink yourself into oblivion, and let the alcohol carry you wherever it may.',
    'And lastly, curl up on the bathroom floor, tormented by a splitting headache, until exhaustion finally lulls you to sleep.',
  ],
  principlesTh: [
    'หากวันหนึ่งคุณรู้สึกว่าโลกใบนี้ช่างปราศจากความงดงาม',
    'และความตายเริ่มกลายเป็นสิ่งหนึ่งที่คุณปรารถนา',
    'สิ่งแรกที่คุณควรทำ คือ ลองใส่แว่นตา แล้วเงยหน้ามองท้องฟ้าให้ไกลออกไปกว่าที่เคย',
    'สิ่งที่สอง คือ ปล่อยตัวให้จมดิ่งลงในฤทธิ์ของแอลกอฮอล์ ดื่มด่ำกับความมึนเมา ราวกับต้องการหลบหนีจากโลกใบเดิม แม้เพียงชั่วขณะ',
    'และสิ่งสุดท้าย คือ ขดตัวอยู่ในห้องน้ำ ปล่อยให้ความปวดร้าวกัดกินร่างกาย จนในที่สุด คุณก็เผลอหลับไปท่ามกลางความทรมานนั้น',
  ],
  authorImage: '/images/pfp.jpg',
  sidebarImage: '/images/tabim.jpg',
};

export const INITIAL_STORIES: Story[] = []
