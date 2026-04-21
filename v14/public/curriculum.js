// ═══════════════════════════════════════════════════════════════════════════
// RBTR Dojo · Curricula
// 30-day structured learning programmes baked in.
// Sources: JustinGuitar (gold-standard free beginner course),
//          Turkish Tea Time, BBC Languages, Fluent in 3 Months.
// Day numbers use streak.start_date as Day 1; curriculum loops weekly-ish
// so missed days don't break the sequence.
// ═══════════════════════════════════════════════════════════════════════════

window.RBTR_CURRICULUM = {

  guitar: {
    title: '🎸 Guitar · 30-day Beginner Path',
    source: 'JustinGuitar Beginner Grade 1',
    sourceUrl: 'https://www.justinguitar.com/categories/beginner-guitar-lessons-grade-1',
    targetMinutes: 15,
    days: [
      // Week 1 — Posture, tuning, first chords
      { day: 1,  topic: 'Guitar posture + tuning', url: 'https://www.justinguitar.com/guitar-lessons/how-to-hold-your-guitar-b1-101', note: '5 min posture · 5 min tune using a free tuner app · 5 min get comfy' },
      { day: 2,  topic: 'A chord (open)',           url: 'https://www.justinguitar.com/guitar-lessons/a-chord-bc-104', note: 'Fret it, strum down slowly, lift cleanly, repeat. 15 min reps.' },
      { day: 3,  topic: 'D chord (open)',           url: 'https://www.justinguitar.com/guitar-lessons/d-chord-bc-105', note: 'Same drill. Strum slowly, aim for zero buzz.' },
      { day: 4,  topic: 'A → D switch',             url: 'https://www.justinguitar.com/guitar-lessons/a-to-d-chord-change-bc-106', note: '1-minute changes drill. Count your reps.' },
      { day: 5,  topic: 'E chord (open)',           url: 'https://www.justinguitar.com/guitar-lessons/e-chord-bc-107', note: 'Big open sound. Drill A → D → E.' },
      { day: 6,  topic: 'First strum pattern',      url: 'https://www.justinguitar.com/guitar-lessons/old-faithful-strumming-pattern-bc-112', note: 'Down-Down-Up-Up-Down-Up "Old Faithful".' },
      { day: 7,  topic: 'Week 1 review',            url: 'https://www.justinguitar.com/categories/beginner-guitar-lessons-grade-1', note: 'Play A, D, E with Old Faithful pattern. Record yourself.' },

      // Week 2 — More chords
      { day: 8,  topic: 'Em chord',                 url: 'https://www.justinguitar.com/guitar-lessons/em-chord-bc-108', note: 'Easiest chord in the world. Enjoy.' },
      { day: 9,  topic: 'Am chord',                 url: 'https://www.justinguitar.com/guitar-lessons/am-chord-bc-109', note: 'Very similar to E shape but on different strings.' },
      { day: 10, topic: 'Em → Am switch',           url: 'https://www.justinguitar.com/guitar-lessons/change-chords-faster-bc-110', note: '1-min changes.' },
      { day: 11, topic: 'G chord (easy version)',   url: 'https://www.justinguitar.com/guitar-lessons/g-chord-bc-111', note: 'The one that makes everything sound good.' },
      { day: 12, topic: 'C chord (cheat version)',  url: 'https://www.justinguitar.com/guitar-lessons/c-chord-bc-113', note: 'Use Cadd9 or cheat-C if full C is buzzing.' },
      { day: 13, topic: 'Chord perfect drill',      url: 'https://www.justinguitar.com/guitar-lessons/chord-perfect-drill-bc-114', note: 'Finger placement one at a time. Slow and clean.' },
      { day: 14, topic: 'Week 2 song: Knockin\' on Heaven\'s Door', url: 'https://www.justinguitar.com/guitar-lessons/knockin-on-heavens-door-bob-dylan-st-216', note: 'G, D, Am, C — you know all four now. Play the whole song.' },

      // Week 3 — Rhythm, timing, more songs
      { day: 15, topic: 'Reading strum patterns',   url: 'https://www.justinguitar.com/guitar-lessons/reading-strumming-patterns-bc-115', note: 'How to read D-D-U notation.' },
      { day: 16, topic: 'Strum pattern 2',          url: 'https://www.justinguitar.com/guitar-lessons/strumming-pattern-2-bc-116', note: 'Adds ghost strums. Keeps wrist loose.' },
      { day: 17, topic: 'Horse With No Name',       url: 'https://www.justinguitar.com/guitar-lessons/horse-with-no-name-america-st-001', note: 'Em + D6add9/F#. Classic easy two-chord song.' },
      { day: 18, topic: 'D → A chord change drill', url: 'https://www.justinguitar.com/guitar-lessons/change-chords-faster-bc-110', note: 'Most common change in rock. 1-min drill.' },
      { day: 19, topic: 'Bad Moon Rising',          url: 'https://www.justinguitar.com/guitar-lessons/bad-moon-rising-creedence-clearwater-st-006', note: 'D, A, G, D. Sing along if you fancy.' },
      { day: 20, topic: 'Strumming dynamics',       url: 'https://www.justinguitar.com/guitar-lessons/dynamics-bc-117', note: 'Loud/soft. Makes playing feel alive.' },
      { day: 21, topic: 'Week 3 review',            url: 'https://www.justinguitar.com/categories/beginner-guitar-lessons-grade-1', note: 'Play all chords learned + both songs. Record progress.' },

      // Week 4 — F chord, power chords, first real song
      { day: 22, topic: 'Easy F (Fmaj7)',           url: 'https://www.justinguitar.com/guitar-lessons/f-chord-easy-fmaj7-bc-118', note: 'Stepping stone to full F. No barre yet.' },
      { day: 23, topic: 'Power chord shape',        url: 'https://www.justinguitar.com/guitar-lessons/power-chords-pc-101', note: 'Two fingers. The foundation of rock.' },
      { day: 24, topic: 'One-finger barre',         url: 'https://www.justinguitar.com/guitar-lessons/the-mini-f-chord-bc-119', note: 'Start building index-finger strength.' },
      { day: 25, topic: 'Wonderwall (first half)',  url: 'https://www.justinguitar.com/guitar-lessons/wonderwall-oasis-st-135', note: 'The song everyone knows. Capo 2, Em7, G, Dsus4, A7sus4.' },
      { day: 26, topic: 'Wonderwall (full song)',   url: 'https://www.justinguitar.com/guitar-lessons/wonderwall-oasis-st-135', note: 'Full structure with strum pattern.' },
      { day: 27, topic: 'Full F chord',             url: 'https://www.justinguitar.com/guitar-lessons/f-chord-bc-120', note: 'The barre F. Go slow. Everyone struggles. Keep at it.' },
      { day: 28, topic: 'Free Fallin\'',            url: 'https://www.justinguitar.com/guitar-lessons/free-fallin-tom-petty-st-029', note: 'D, Dsus4, A, Asus4, Em. Tom Petty. Vibe.' },

      // Week 5 — Close out + open learning
      { day: 29, topic: 'Record yourself playing',  url: 'https://www.justinguitar.com/categories/beginner-guitar-lessons-grade-1', note: 'Pick a song. Record on phone. Watch back. Honest self-review.' },
      { day: 30, topic: 'Grade 1 finish · pick next', url: 'https://www.justinguitar.com/categories/beginner-guitar-lessons-grade-2', note: 'You\'ve done 30 days. Decide: more Grade 1 or move to Grade 2. Either is fine.' },
    ],
  },

  turkish: {
    title: '🇹🇷 Turkish · 30-day Route Survival',
    source: 'Tailored for overland travel — greetings, fuel, food, repair, emergencies',
    sourceUrl: 'https://www.turkishteatime.com',
    targetMinutes: 10,
    days: [
      // Week 1 — Greetings, politeness, numbers
      { day: 1,  topic: 'Greetings',          phrases: [['Merhaba','Hello'],['Günaydın','Good morning'],['İyi akşamlar','Good evening'],['Hoşça kal','Goodbye (you staying)'],['Güle güle','Goodbye (you leaving)']], url: 'https://www.turkishteatime.com/beginner/1' },
      { day: 2,  topic: 'Please & thanks',    phrases: [['Lütfen','Please'],['Teşekkür ederim','Thank you'],['Rica ederim','You\'re welcome'],['Özür dilerim','I\'m sorry'],['Affedersiniz','Excuse me']], url: 'https://www.turkishteatime.com/beginner/2' },
      { day: 3,  topic: 'Yes / No basics',    phrases: [['Evet','Yes'],['Hayır','No'],['Belki','Maybe'],['Tamam','OK'],['Anladım','I understand']], url: 'https://www.turkishteatime.com/beginner/3' },
      { day: 4,  topic: 'Numbers 1-10',       phrases: [['Bir','1'],['İki','2'],['Üç','3'],['Dört','4'],['Beş','5'],['Altı','6'],['Yedi','7'],['Sekiz','8'],['Dokuz','9'],['On','10']], url: 'https://www.turkishteatime.com/beginner/6' },
      { day: 5,  topic: 'Numbers 20-1000',    phrases: [['Yirmi','20'],['Elli','50'],['Yüz','100'],['Beş yüz','500'],['Bin','1000']], url: 'https://www.turkishteatime.com/beginner/7' },
      { day: 6,  topic: 'Asking names',       phrases: [['Adınız ne?','What\'s your name?'],['Benim adım Ben','My name is Ben'],['Memnun oldum','Nice to meet you']], url: 'https://www.turkishteatime.com/beginner/4' },
      { day: 7,  topic: 'Family words',       phrases: [['Eş','Wife/husband'],['Oğul','Son'],['Anne','Mother'],['Baba','Father'],['Çocuk','Child']], url: 'https://www.turkishteatime.com/beginner/5' },

      // Week 2 — Directions, time, transport
      { day: 8,  topic: 'Where is…?',         phrases: [['…nerede?','Where is…?'],['Tuvalet nerede?','Where is the toilet?'],['Benzin istasyonu nerede?','Where is the petrol station?']], url: 'https://www.turkishteatime.com/beginner/8' },
      { day: 9,  topic: 'Directions',         phrases: [['Sağ','Right'],['Sol','Left'],['Düz','Straight'],['Burada','Here'],['Orada','There']], url: 'https://www.turkishteatime.com/beginner/9' },
      { day: 10, topic: 'Distance & time',    phrases: [['Ne kadar uzak?','How far?'],['Kaç kilometre?','How many km?'],['Kaç saat?','How many hours?']], url: 'https://www.turkishteatime.com/beginner/10' },
      { day: 11, topic: 'Telling time',       phrases: [['Saat kaç?','What time is it?'],['Saat on','Ten o\'clock'],['Sabah','Morning'],['Akşam','Evening']], url: 'https://www.turkishteatime.com/beginner/11' },
      { day: 12, topic: 'Days of the week',   phrases: [['Pazartesi','Monday'],['Salı','Tuesday'],['Çarşamba','Wednesday'],['Perşembe','Thursday'],['Cuma','Friday'],['Cumartesi','Saturday'],['Pazar','Sunday']], url: 'https://www.turkishteatime.com/beginner/12' },
      { day: 13, topic: 'Transport words',    phrases: [['Araba','Car'],['Kamyon','Truck'],['Yol','Road'],['Otoyol','Motorway'],['Sınır','Border']], url: 'https://www.turkishteatime.com/beginner/13' },
      { day: 14, topic: 'Week 2 review',      phrases: [['Review all above','Use Anki or write them out 3x']], url: 'https://www.turkishteatime.com/beginner/14' },

      // Week 3 — Fuel, repair, camp (crucial for truck overlanding)
      { day: 15, topic: 'At the fuel station', phrases: [['Dolu lütfen','Fill it up please'],['Dizel','Diesel'],['Benzin','Petrol'],['50 litre','50 litres'],['Hava basıncı','Tyre pressure']], url: 'https://www.turkishteatime.com/beginner/15' },
      { day: 16, topic: 'Vehicle problems',   phrases: [['Bozuk','Broken'],['Lastik patladı','Tyre burst'],['Motor çalışmıyor','Engine won\'t start'],['Yardım edin','Help me'],['Tamirci nerede?','Where\'s a mechanic?']], url: 'https://www.turkishteatime.com/beginner/16' },
      { day: 17, topic: 'Parking & camp',     phrases: [['Kamp alanı','Campsite'],['Burada kamp yapabilir miyim?','Can I camp here?'],['Ücret nedir?','What\'s the price?'],['Su','Water'],['Elektrik','Electricity']], url: 'https://www.turkishteatime.com/beginner/17' },
      { day: 18, topic: 'Shopping essentials', phrases: [['Bu ne kadar?','How much is this?'],['Çok pahalı','Too expensive'],['İndirim var mı?','Any discount?'],['Kart kabul ediyor musunuz?','Do you accept card?']], url: 'https://www.turkishteatime.com/beginner/18' },
      { day: 19, topic: 'Food basics',        phrases: [['Ekmek','Bread'],['Su','Water'],['Çay','Tea'],['Kahve','Coffee'],['Bir bira lütfen','One beer please']], url: 'https://www.turkishteatime.com/beginner/19' },
      { day: 20, topic: 'At a restaurant',    phrases: [['Menü lütfen','Menu please'],['Hesap lütfen','Bill please'],['Afiyet olsun','Enjoy your meal'],['Çok lezzetli','Very tasty']], url: 'https://www.turkishteatime.com/beginner/20' },
      { day: 21, topic: 'Week 3 review',      phrases: [['Role-play: fuel stop, mechanic, campsite booking, restaurant']], url: 'https://www.turkishteatime.com/beginner/21' },

      // Week 4 — Emergencies, small talk, pronouns
      { day: 22, topic: 'Emergency words',    phrases: [['Yardım!','Help!'],['Polis','Police'],['Hastane','Hospital'],['Doktor','Doctor'],['Ambulans','Ambulance']], url: 'https://www.turkishteatime.com/beginner/22' },
      { day: 23, topic: 'Feeling ill',        phrases: [['Hastayım','I\'m ill'],['Başım ağrıyor','My head hurts'],['Midem bulanıyor','I feel sick'],['Ateşim var','I have a fever']], url: 'https://www.turkishteatime.com/beginner/23' },
      { day: 24, topic: 'Family with me',     phrases: [['Ailem','My family'],['Eşim','My wife'],['İki oğlum var','I have two sons'],['Çocuklar','Children']], url: 'https://www.turkishteatime.com/beginner/24' },
      { day: 25, topic: 'Journey small talk', phrases: [['İngiltere\'den geliyorum','I\'m from England'],['Kamyonla seyahat ediyorum','I\'m travelling by truck'],['Çok güzel ülke','Very beautiful country']], url: 'https://www.turkishteatime.com/beginner/25' },
      { day: 26, topic: 'Pronouns + to be',   phrases: [['Ben','I'],['Sen','You (informal)'],['O','He/she'],['Biz','We'],['Onlar','They']], url: 'https://www.turkishteatime.com/beginner/26' },
      { day: 27, topic: 'Past tense basics',  phrases: [['Geldim','I came'],['Gittim','I went'],['Yedim','I ate'],['İçtim','I drank']], url: 'https://www.turkishteatime.com/beginner/27' },
      { day: 28, topic: 'Future basics',      phrases: [['Gideceğim','I will go'],['Yarın','Tomorrow'],['Haftaya','Next week']], url: 'https://www.turkishteatime.com/beginner/28' },

      // Week 5 close
      { day: 29, topic: 'Put it together',    phrases: [['30-second self-intro','Try: name, where from, wife + kids, why travelling']], url: 'https://www.turkishteatime.com/beginner/29' },
      { day: 30, topic: 'Pick next language', phrases: [['Well done — you have functional survival Turkish. Next route language: Russian or Farsi?']], url: 'https://www.turkishteatime.com/beginner/30' },
    ],
  },
};

// Helper: given a streak's start date, return the right day object from curriculum
window.RBTR_CURRICULUM_GET = function(subject, streakStartISO) {
  const c = window.RBTR_CURRICULUM[subject];
  if (!c) return null;
  const start = streakStartISO ? new Date(streakStartISO) : new Date();
  const now = new Date();
  const dayIndex = Math.max(0, Math.floor((now - start) / 86400000)) % c.days.length;
  return { ...c.days[dayIndex], meta: { title: c.title, source: c.source, sourceUrl: c.sourceUrl, targetMinutes: c.targetMinutes, total: c.days.length } };
};
