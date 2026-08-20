/**
 * Worker-facing strings only. The booker side stays in English for now, but the
 * shape is here for it. Every string that a worker sees must also be safe to
 * read aloud by expo-speech — no abbreviations, no symbols.
 */
export type Lang = 'en' | 'hi' | 'bn';

const dict = {
  en: {
    work: 'Work', running: 'Running', earnings: 'Earnings', help: 'Help',
    dutyOn: 'I am ready for work', dutyOff: 'Not working now',
    dutyOnSub: 'You will hear work calls', dutyOffSub: 'Taking rest',
    today: "Today's earning", week: 'This week', unit: 'nags',
    openJobs: 'open jobs', readAll: 'Read all', yes: 'Yes', no: 'No',
    mine: 'My market', nearby: 'Nearby', all: 'All', nearest: 'Nearest', bestPay: 'Best pay',
    places: 'places', filled: 'Filled', extra: 'extra', total: 'total',
    reached: 'Reached', picked: 'Picked up', dropped: 'Delivered', done: 'Job done',
    callShop: 'Call the shop', callHelp: 'Call for help', myCard: 'My card',
    verifyTitle: 'Your card is being made',
    verifyBody: 'Come to the market desk with your Aadhaar. Photo and number are made there.',
    seeWork: 'See work now', confirmCount: 'How many? Both press', photo: 'Take a photo',
    noWork: 'No open work right now. Try All.', heavy: 'This load is over 50 kg',
    heavySub: 'Ask for a second man, or refuse',
  },
  hi: {
    work: 'काम', running: 'चालू', earnings: 'कमाई', help: 'मदद',
    dutyOn: 'मैं काम के लिए तैयार हूँ', dutyOff: 'अभी काम नहीं',
    dutyOnSub: 'आपको काम की आवाज़ आएगी', dutyOffSub: 'आराम कर रहे हैं',
    today: 'आज की कमाई', week: 'इस हफ़्ते', unit: 'नग',
    openJobs: 'खुले काम', readAll: 'सब सुनिए', yes: 'हाँ', no: 'ना',
    mine: 'मेरा बाज़ार', nearby: 'पास के बाज़ार', all: 'सब', nearest: 'सबसे पास', bestPay: 'ज़्यादा पैसा',
    places: 'जगह', filled: 'भर गया', extra: 'ऊपर से', total: 'कुल',
    reached: 'पहुँच गया', picked: 'माल उठा लिया', dropped: 'पहुँचा दिया', done: 'काम पूरा',
    callShop: 'दुकान को फ़ोन कीजिए', callHelp: 'फ़ोन करके मदद लीजिए', myCard: 'मेरा कार्ड',
    verifyTitle: 'कार्ड बन रहा है',
    verifyBody: 'बाज़ार के डेस्क पर आधार लेकर आइए। फ़ोटो और नंबर वहीं बनेगा।',
    seeWork: 'अभी काम देखिए', confirmCount: 'कितने नग? दोनों दबाइए', photo: 'माल की फ़ोटो लीजिए',
    noWork: 'अभी कोई खुला काम नहीं। ऊपर "सब" दबाइए।', heavy: 'यह नग 50 किलो से भारी है',
    heavySub: 'दो आदमी माँगिए या मना कीजिए',
  },
  bn: {
    work: 'কাজ', running: 'চলছে', earnings: 'আয়', help: 'সাহায্য',
    dutyOn: 'আমি কাজের জন্য প্রস্তুত', dutyOff: 'এখন কাজ নয়',
    dutyOnSub: 'কাজের ডাক আসবে', dutyOffSub: 'বিশ্রাম নিচ্ছেন',
    today: 'আজকের আয়', week: 'এই সপ্তাহে', unit: 'নগ',
    openJobs: 'খোলা কাজ', readAll: 'সব শুনুন', yes: 'হ্যাঁ', no: 'না',
    mine: 'আমার বাজার', nearby: 'কাছের বাজার', all: 'সব', nearest: 'সবচেয়ে কাছে', bestPay: 'বেশি টাকা',
    places: 'জায়গা', filled: 'ভরে গেছে', extra: 'উপরে', total: 'মোট',
    reached: 'পৌঁছেছি', picked: 'মাল তুলেছি', dropped: 'পৌঁছে দিয়েছি', done: 'কাজ শেষ',
    callShop: 'দোকানে ফোন করুন', callHelp: 'ফোন করে সাহায্য নিন', myCard: 'আমার কার্ড',
    verifyTitle: 'কার্ড তৈরি হচ্ছে',
    verifyBody: 'বাজারের ডেস্কে আধার নিয়ে আসুন। ছবি আর নম্বর সেখানেই হবে।',
    seeWork: 'এখন কাজ দেখুন', confirmCount: 'কত নগ? দুজনেই টিপুন', photo: 'মালের ছবি তুলুন',
    noWork: 'এখন কোনো খোলা কাজ নেই। উপরে "সব" টিপুন।', heavy: 'এই নগ ৫০ কেজির বেশি',
    heavySub: 'দুজন চান বা না বলুন',
  },
} as const;

export type Key = keyof typeof dict.en;
export const t = (lang: Lang, key: Key): string => dict[lang][key] ?? dict.en[key];

/** The sentence a worker hears when he presses the speaker on a job card. */
export function jobSentence(lang: Lang, j: {
  pickupText: string; units: number; kgPerUnit: number; fareBase: number; fareExtra: number;
  unitWord: string; minutes?: number;
}): string {
  const total = j.fareBase + j.fareExtra;
  if (lang === 'hi') {
    return `${j.pickupText}। ${j.units} ${j.unitWord}। हर ${j.unitWord} करीब ${j.kgPerUnit} किलो। ` +
      (j.fareExtra ? `${j.fareBase} रुपये, और ऊपर से ${j.fareExtra} रुपये — कुल ${total} रुपये मिलेंगे।`
                   : `${total} रुपये मिलेंगे।`);
  }
  if (lang === 'bn') {
    return `${j.pickupText}। ${j.units} ${j.unitWord}। প্রতি ${j.unitWord} প্রায় ${j.kgPerUnit} কেজি। ` +
      (j.fareExtra ? `${j.fareBase} টাকা, আর উপরে ${j.fareExtra} টাকা — মোট ${total} টাকা পাবেন।`
                   : `${total} টাকা পাবেন।`);
  }
  return `${j.pickupText}. ${j.units} ${j.unitWord}s, about ${j.kgPerUnit} kilos each. ` +
    (j.fareExtra ? `${j.fareBase} rupees plus ${j.fareExtra} extra — ${total} rupees in all.`
                 : `${total} rupees.`);
}
