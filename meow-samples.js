'use strict';

/** Pixabay + Mixkit cat vocal sample list. */
const MEOW_SAMPLE_FILES = Object.freeze([
  'mixkit-angry-cartoon-kitty-meow-94.mp3',
  'mixkit-big-wild-cat-long-purr-96.mp3',
  'mixkit-cartoon-kitty-begging-meow-92.mp3',
  'mixkit-cartoon-little-cat-meow-91.mp3',
  'mixkit-domestic-cat-hungry-meow-45.mp3',
  'mixkit-little-cat-attention-meow-86.mp3',
  'mixkit-sweet-kitty-meow-93.mp3',
  '100375-kitten-miaowing.mp3',
  '101754-alison-barreau-2016-2017-catinawell.mp3',
  '102607-cat-call-meow.mp3',
  '102992-zcatsou1.mp3',
  '103437-clap-meow.mp3',
  '105182-anime-cat-girl.mp3',
  '105710-catroom-meow-5.mp3',
  '106197-hungry-cats.mp3',
  '106707-cat-doppler.mp3',
  '107293-katsumi-1.mp3',
  '107471-cat-pleads.mp3',
  '107836-meow.mp3',
  '110120-funny-meow.mp3',
  '141718-nonino-new.mp3',
  '14536-cat-meow.mp3',
  '179482-cat-meow.mp3',
  '186944-cute-kitty-meow.mp3',
  '190844-cat-meowing.mp3',
  '193067-annoyed-cat-meow.mp3',
  '195613-cat-meow.mp3',
  '202542-mreaow.mp3',
  '225307-cat-meow-loud.mp3',
  '230900-short-meow-kitten.mp3',
  '240675-angry-cat-hq-sound-effect.mp3',
  '242762-cali-meow.mp3',
  '246012-funny-cat-meow.mp3',
  '247118-funny-cat-meow.mp3',
  '273394-meow.mp3',
  '273395-meow.mp3',
  '279336-sound-effect-cat-meow.mp3',
  '280347-kitty.mp3',
  '282900-sound-effect-cat-chattering-and-meowing.mp3',
  '282902-sound-effect-cat-chirruping-and-meowing.mp3',
  '293290-cat-meowing-type-02.mp3',
  '293291-cat-meowing-type-01.mp3',
  '297927-cat-meow.mp3',
  '298528-meow.mp3',
  '306178-cat-meow-1-fx.mp3',
  '306179-cat-meow-3-fx.mp3',
  '306180-cat-meow-4-fx.mp3',
  '306181-cat-meow-2-fx.mp3',
  '306182-cat-meow-5-fx.mp3',
  '306184-cat-meow-8-fx.mp3',
  '306185-cat-meow-9-fx.mp3',
  '306186-cat-meow-7-fx.mp3',
  '306187-cat-meow-6-fx.mp3',
  '306188-cat-meow-10-fx.mp3',
  '306189-cat-meow-14-fx.mp3',
  '306190-cat-meow-15-fx.mp3',
  '306191-cat-meow-12-fx.mp3',
  '306192-cat-meow-13-fx.mp3',
  '306193-cat-meow-11-fx.mp3',
  '321642-cat-meow.mp3',
  '322662-meow-female-voice.mp3',
  '323465-cat-meow-1-fx.mp3',
  '323466-cat-meow-2-fx.mp3',
  '323467-cat-meow-5-fx.mp3',
  '323468-cat-meow-6-fx.mp3',
  '323469-cat-meow-4-fx.mp3',
  '323470-cat-meow-3-fx.mp3',
  '324943-cat-meowing.mp3',
  '332671-kitten-calling-for-mother-cute-meowing-sound.mp3',
  '333768-funny-cat-meow-sound-effect-1.mp3',
  '333769-funny-cat-meow-loop-sound.mp3',
  '333770-cute-cat-meow-sound.mp3',
  '352765-long-meow.mp3',
  '352842-shrt-meow.mp3',
  '355747-cutie-cat.mp3',
  '361882-cat-meow.mp3',
  '37487-gato-1.mp3',
  '38576-little-cat-meow.mp3',
  '39319-3-meows-loop.mp3',
  '39411-meow.mp3',
  '40299-cat-salem.mp3',
  '41730-tomcat2.mp3',
  '43755-lucky-meowing.mp3',
  '43822-cat-meow.mp3',
  '43850-cat-3.mp3',
  '46443-cat-being-picked-up.mp3',
  '6226-cat-meow.mp3',
  '77219-meow-isolated.mp3',
  '80256-262312-steffcaffrey-cat-meow1.mp3',
  '80492-mr-spock-meow.mp3',
  '80525-cat-meow.mp3',
  '80899-cat-meow-1.mp3',
  '81035-cat-crying.mp3',
  '81626-cat-meow.mp3',
  '81649-xoraya-begging-for-fish.mp3',
  '82091-angry-cat-meow.mp3',
  '82386-zcatsou4.mp3',
  '82957-mjau3.mp3',
  '85175-cat-meow.mp3',
  '85182-kitty-meow.mp3',
  '86859-fiji-meow-01.mp3',
  '89108-cat.mp3',
  '89568-meow-sample.mp3',
  '89814-catmeow1.mp3',
  '90371-meow.mp3',
  '90564-cat-meow-once.mp3',
  '91688-chat.mp3',
  '91989-beef-mow1.mp3',
  '92665-cat-betty-mcdaniels-3.mp3',
  '93252-catfight.mp3',
  '93404-kitten-meow-evil-really-cool.mp3',
  '95112-gato-2-3.mp3',
  '96248-cat-growl.mp3',
  '98721-cat.mp3',
  '99835-cat-meow.mp3',
]);

const MEOW_SAMPLE_KIND_BY_FILE = Object.freeze({
  'mixkit-angry-cartoon-kitty-meow-94.mp3': 'meow',
  'mixkit-big-wild-cat-long-purr-96.mp3': 'purr',
  'mixkit-cartoon-kitty-begging-meow-92.mp3': 'ask',
  'mixkit-cartoon-little-cat-meow-91.mp3': 'meow',
  'mixkit-domestic-cat-hungry-meow-45.mp3': 'ask',
  'mixkit-little-cat-attention-meow-86.mp3': 'meow',
  'mixkit-sweet-kitty-meow-93.mp3': 'meow',
});

const MEOW_SAMPLE_KIND_MEOW = 'meow';
const MEOW_SAMPLE_KIND_ASK = 'ask';
const MEOW_SAMPLE_KIND_PURR = 'purr';

function meowSampleKindForFile(fileName) {
  if (MEOW_SAMPLE_KIND_BY_FILE[fileName]) {
    return MEOW_SAMPLE_KIND_BY_FILE[fileName];
  }
  return MEOW_SAMPLE_KIND_MEOW;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MEOW_SAMPLE_FILES,
    MEOW_SAMPLE_KIND_BY_FILE,
    MEOW_SAMPLE_KIND_MEOW,
    MEOW_SAMPLE_KIND_ASK,
    MEOW_SAMPLE_KIND_PURR,
    meowSampleKindForFile,
  };
}

if (typeof globalThis !== 'undefined') {
  globalThis.MEOW_SAMPLE_FILES = MEOW_SAMPLE_FILES;
  globalThis.MEOW_SAMPLE_KIND_BY_FILE = MEOW_SAMPLE_KIND_BY_FILE;
  globalThis.MEOW_SAMPLE_KIND_MEOW = MEOW_SAMPLE_KIND_MEOW;
  globalThis.MEOW_SAMPLE_KIND_ASK = MEOW_SAMPLE_KIND_ASK;
  globalThis.MEOW_SAMPLE_KIND_PURR = MEOW_SAMPLE_KIND_PURR;
  globalThis.meowSampleKindForFile = meowSampleKindForFile;
}
