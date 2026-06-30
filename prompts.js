/**
 * prompts.js — toàn bộ prompt "chất xám" của sản phẩm.
 * File này CHỈ chạy trên Worker, không bao giờ gửi xuống frontend.
 */

/**
 * prompts.js — TOÀN BỘ prompt "chất xám" của sản phẩm.
 * File này CHỈ tồn tại trong Worker, không bao giờ gửi xuống frontend.
 * Frontend chỉ gửi {action, ...data}, Worker tự ráp prompt từ đây.
 */

// Nguyên văn buildPrompt() lấy từ index.html (dòng ~3087-3310), không sửa nội dung.
function buildAnalyzePrompt(sentence, level) {
  if (level === "A1") return `Analyze this English sentence for A1 Vietnamese beginners: "${sentence}"
Return ONLY valid JSON — no markdown. ALWAYS return the "words" object even for 1-word sentences.

GROUPING RULES — group these into ONE key (they form a single meaning):
1. TENSE CLUSTERS (highest priority — always group):
   "is/am/are going to" → one key "is going to" = "sẽ"
   "was/were going to" → one key "was going to" = "định sẽ"
   "is/am/are V-ing" → one key e.g. "is visiting" = "đang thăm"
   "was/were V-ing" → one key e.g. "was eating" = "đang ăn"
   "have/has V3" → one key e.g. "have eaten" = "đã ăn"
   "will have V3" → one key = "sẽ đã"
   "will be V-ing" → one key = "sẽ đang"
   "had V3" → one key e.g. "had gone" = "đã đi"
   "will + verb" → one key e.g. "will have" = "sẽ có"
   "used to + verb" → one key = "đã từng"
2. MODAL CLUSTERS: "can play", "should go", "must be", "could have", "would like" → one key
3. NEGATIVES: "do not/don't", "does not/doesn't", "did not/didn't", "will not/won't", "cannot/can't", "is not/isn't", "are not/aren't" → one key
4. CONTRACTIONS: "I'm", "it's", "you're", "we'll", "I've", "don't", "can't" → one key exactly as written
5. PHRASAL VERBS: "look at", "go to", "come back", "pick up" → one key
6. FIXED PHRASES: "a lot of", "there is", "there are", "would like", "how are you" → one key

After grouping the above, remaining individual words get their own key.

EXAMPLES:
Input: "A friend is going to visit me."
Output: {"sentence":"Một người bạn sẽ đến thăm tôi.","words":{"A":{"meaning":"một","lemma":null,"level":"A1","type":"article","grammar":null,"irregular":null,"example":"A cat sat on the mat."},"friend":{"meaning":"người bạn","lemma":null,"level":"A1","type":"noun","grammar":null,"irregular":null,"example":"She is my best friend."},"is going to":{"meaning":"sẽ","lemma":"go","level":"A1","type":"phrase","grammar":"be going to = future plan","irregular":null,"example":"He is going to visit us tomorrow."},"visit":{"meaning":"thăm","lemma":null,"level":"A1","type":"verb","grammar":"base form","irregular":null,"example":"We visit grandma every Sunday."},"me":{"meaning":"tôi","lemma":null,"level":"A1","type":"pronoun","grammar":null,"irregular":null,"example":"She called me."}}}

Input: "I think we will have dinner together."
Output: {"sentence":"Tôi nghĩ chúng ta sẽ ăn tối cùng nhau.","words":{"I":{"meaning":"tôi","lemma":null,"level":"A1","type":"pronoun","grammar":null,"irregular":null,"example":"I am a student."},"think":{"meaning":"nghĩ","lemma":null,"level":"A1","type":"verb","grammar":"present simple","irregular":null,"example":"I think it is correct."},"we":{"meaning":"chúng ta","lemma":null,"level":"A1","type":"pronoun","grammar":null,"irregular":null,"example":"We go to school."},"will have":{"meaning":"sẽ có","lemma":"have","level":"A1","type":"phrase","grammar":"will + verb (future)","irregular":null,"example":"We will have a party tomorrow."},"dinner":{"meaning":"bữa tối","lemma":null,"level":"A1","type":"noun","grammar":null,"irregular":null,"example":"Dinner is at 7pm."},"together":{"meaning":"cùng nhau","lemma":null,"level":"A1","type":"adverb","grammar":null,"irregular":null,"example":"Let us eat together."}}}

Input: "It's Friday!"
Output: {"sentence":"Hôm nay là thứ Sáu!","words":{"It's":{"meaning":"đó là/hôm nay là","lemma":"be","level":"A1","type":"auxiliary","grammar":"it+is contraction","irregular":null,"example":"It's a beautiful day."},"Friday":{"meaning":"thứ Sáu","lemma":null,"level":"A1","type":"noun","grammar":null,"irregular":null,"example":"Friday is the last day of the week."}}}

Return JSON:
{"sentence":"Vietnamese translation","words":{"KEY":{"meaning":"Vietnamese 1-4 words (REQUIRED, never empty)","lemma":"base form or null","level":"A1|A2","type":"noun|verb|adjective|adverb|pronoun|preposition|conjunction|article|auxiliary|phrase|interjection","grammar":"tense/structure note or null","irregular":"V2→V3 for irregular verbs or null","example":"English example sentence (REQUIRED, never empty)"}}}

STRICT RULES:
- Keys for tense clusters use the EXACT text from sentence: "is going to", "will have", "has eaten"
- NEVER use punctuation (.,?!;:) as a key
- NEVER use empty key ""
- NEVER duplicate a key
- "meaning": real Vietnamese, never "", never null, never the English word itself
- "example": real English sentence, never "", never null
- Cover EVERY word — either in a group key or individually
- do/does/did in questions → meaning:"(trợ từ hỏi)"
- "level": A1 for most basic, A2 for harder words`;

  if (level === "A1-A2") return `Analyze this English sentence for Vietnamese A2 learners: "${sentence}"
Return ONLY valid JSON — no markdown.

GROUPING RULES — group words into MEANINGFUL PHRASES (2-5 words), NOT individual words:
1. VERB GROUPS: subject+verb together — "I am", "We used to live", "she doesn't like", "they went"
2. TENSE/ASPECT: full verb phrase — "used to live", "have been", "is going to", "don't know", "couldn't play"
3. NOUN PHRASES: article+adj+noun — "a big city", "the north of Italy", "the children"
4. PREPOSITIONAL PHRASES: prep+noun — "in Turin", "at school", "on Monday", "to the museum"
5. FIXED EXPRESSIONS: "good morning", "nice to meet you", "a lot of", "there is/are", "lots of people"
6. PROPER NOUNS: consecutive caps = one entry — "New York", "United Kingdom"
Only use single-word entries when a word truly stands alone.
KEEP CHUNKS SHORT (max 4 words). Split long groups sensibly.

GOOD example for "Sometimes, we went to the museum":
{"sentence":"Đôi khi, chúng tôi đã đến bảo tàng.","words":{"Sometimes":{"meaning":"đôi khi","lemma":"sometimes","level":"A2","type":"adverb","grammar":null,"example":"Sometimes I go for a walk."},"we went":{"meaning":"chúng tôi đã đi","lemma":"go","level":"A1","type":"verb","grammar":"past simple (V2)","example":"We went to the park."},"to the museum":{"meaning":"đến bảo tàng","lemma":null,"level":"A2","type":"phrase","grammar":"to + noun","example":"We went to the museum on Sunday."}}}

Return JSON:
{"sentence":"Vietnamese translation (REQUIRED, never empty, never null)","words":{"WORD OR PHRASE":{"meaning":"Vietnamese 1-5 words (REQUIRED, NEVER empty or null)","lemma":"base form or null","level":"A1|A2|B1|B2","type":"noun|verb|adj|adv|pronoun|prep|conj|article|aux|phrase","grammar":"structure note or null","example":"English example sentence (REQUIRED, NEVER empty or null)"}}}

⚠️ CRITICAL — every single entry MUST have:
- "meaning": real Vietnamese translation, NEVER "", NEVER null, NEVER "meaning", NEVER a field name
- "example": a real English sentence using the word/phrase, NEVER "", NEVER null

VERB FORMS — mandatory lemma rules:
- "went" → lemma:"go", grammar:"past simple (V2)"
- "enjoyed" → lemma:"enjoy", grammar:"past simple (V2)"
- "couldn't" → lemma:"can", grammar:"modal negative"
- "playing" → lemma:"play", grammar:"V-ing"
- "been" → lemma:"be", grammar:"past participle (V3)"
- "were" → lemma:"be", grammar:"past simple (V2)"
Grammar for verbs MUST use: "past simple (V2)", "past participle (V3)", "V-ing", "present perfect", "past continuous", "passive", "modal + V", "base form"
Cover EVERY word in the sentence. Never skip a word.`;

  // B1 và B2 dùng chung prompt này (đúng hành vi của code gốc — không có branch riêng cho B2)
  return `Analyze this English sentence for Vietnamese B1 learners: "${sentence}"
Return ONLY valid JSON — no markdown.

CHUNKING GOAL: Group words into MEANINGFUL CLAUSES and PHRASES (2-8 words each).
Think grammatically — NOT by individual words:
- Subject + verb group: "The U.S. carried out" / "Bahrain reported" / "Iranian forces hit"
- Subordinate clause: "after Iranian forces hit" / "which the IRGC claimed" / "which targeted..."

STEP 1 — Identify these unit types in the sentence:
A) VERB PHRASES — phrasal verbs and verb + complement:
   - Phrasal verbs (verb+particle as ONE unit): "carried out", "called off", "set up", "broke out", "taken over"
   - Verb + auxiliary chain: "has been carrying out", "claimed targeted", "was reported to have"

B) PROPER NOUN PHRASES — names, organizations, places (group fully):
   - "The U.S." / "the United States" → one entry
   - "the Iranian Revolutionary Guard Corps" → one entry
   - "the Gulf state" / "the Strait of Hormuz" → one entry
   - RULE: "The" before a proper noun is NOT translated as "cái" — use "(mạo từ)" in token_meanings

C) PREPOSITIONAL PHRASES — prep + noun phrase:
   - TIME prepositions — CRITICAL context rules:
     * "on" + day/date = "vào": "on Friday"→"vào thứ Sáu", "on Saturday morning"→"vào sáng thứ Bảy", "on Sunday"→"vào Chủ nhật"
     * "on" + surface = "trên": "on the table"→"trên bàn", "on the ground"→"dưới đất"
     * "in" + month/year/period = "vào": "in May"→"vào tháng Năm", "in 2024"→"năm 2024"
     * "at" + time = "lúc": "at 9am"→"lúc 9 giờ", "at night"→"vào ban đêm"
     * "after" + event = "sau khi": "after Iranian forces hit"→"sau khi lực lượng Iran tấn công"
     * "a day earlier" = "một ngày trước đó"
   - Place: "in the Gulf" / "at the station" / "to the museum"

D) NOUN PHRASES — determiner + adj + noun:
   - "a cargo vessel" / "retaliatory strikes" / "Iranian drones" / "the Gulf state"

E) FIXED EXPRESSIONS: "as well as" / "in spite of" / "a lot of" / "in order to" / "as a result"

STEP 2 — GROUP into entries. Each entry = one meaningful unit from Step 1.
STEP 3 — For each entry, provide ALL fields accurately.

MEANING RULES (critical for Vietnamese accuracy):
- Phrasal verbs: use natural Vietnamese equivalent of the WHOLE phrase:
  "carried out" → "đã tiến hành" (NOT "mang ra ngoài")
  "called off" → "đã hủy bỏ"
  "set up" → "thành lập" / "thiết lập"
  "broke out" → "bùng nổ"
  "taken over" → "tiếp quản"
- "The U.S." / "The US" → "Hoa Kỳ" or "nước Mỹ" (NEVER "cái Mỹ")
- "on Friday" → "vào thứ Sáu" (NOT "trên thứ Sáu")
- "on Saturday morning" → "vào sáng thứ Bảy" (NOT "trên sáng thứ Bảy")
- "targeted" (phrasal context) → "đã nhắm mục tiêu" (NOT "nhắm" only)
- "claimed" = "tuyên bố" (in news context, NOT "yêu cầu")
- "hit" (a ship) = "tấn công" (NOT "đánh", NOT "trúng" unless projectile context)
- Meaning = 1-4 Vietnamese words, precise in THIS context. No parentheses, no "hoặc".

FEW-SHOT EXAMPLES:

Input: "The U.S. carried out retaliatory strikes against Iran on Friday after Iranian forces hit a cargo vessel in the Strait of Hormuz a day earlier."
Output:
{
  "sentence": "Mỹ đã tiến hành các cuộc không kích trả đũa nhằm vào Iran vào thứ Sáu sau khi lực lượng Iran tấn công một tàu hàng ở eo biển Hormuz một ngày trước đó.",
  "words": {
    "The U.S.": {"phrase":"The U.S.","meaning":"Hoa Kỳ","lemma":"","level":"B1","type":"noun","grammar":"proper noun (country)","token_meanings":{"The":"(mạo từ)","U.S.":"Hoa Kỳ"},"fixed_phrase":"","irregular":""},
    "carried out": {"phrase":"carried out","meaning":"đã tiến hành","lemma":"carry out","level":"B1","type":"phrasal verb","grammar":"past simple (V2)","token_meanings":{"carried":"tiến hành (V2)","out":"(particle)"},"fixed_phrase":"carry out = thực hiện/tiến hành","irregular":"carry→carried→carried"},
    "retaliatory strikes": {"phrase":"retaliatory strikes","meaning":"các cuộc không kích trả đũa","lemma":"","level":"B2","type":"noun","grammar":"noun phrase","token_meanings":{"retaliatory":"trả đũa","strikes":"cuộc không kích"},"fixed_phrase":"","irregular":""},
    "against Iran": {"phrase":"against Iran","meaning":"nhằm vào Iran","lemma":"","level":"A2","type":"phrase","grammar":"prep + proper noun","token_meanings":{"against":"nhằm vào","Iran":"Iran"},"fixed_phrase":"","irregular":""},
    "on Friday": {"phrase":"on Friday","meaning":"vào thứ Sáu","lemma":"","level":"A1","type":"phrase","grammar":"on + day of week = time","token_meanings":{"on":"vào","Friday":"thứ Sáu"},"fixed_phrase":"on + day = vào (NOT trên)","irregular":""},
    "after Iranian forces hit": {"phrase":"after Iranian forces hit","meaning":"sau khi lực lượng Iran tấn công","lemma":"","level":"B1","type":"phrase","grammar":"after + clause (subordinator)","token_meanings":{"after":"sau khi","Iranian":"của Iran","forces":"lực lượng","hit":"tấn công (V2)"},"fixed_phrase":"","irregular":"hit→hit→hit"},
    "a cargo vessel": {"phrase":"a cargo vessel","meaning":"một tàu hàng","lemma":"","level":"B2","type":"noun","grammar":"noun phrase","token_meanings":{"a":"một","cargo":"hàng hóa","vessel":"tàu"},"fixed_phrase":"","irregular":""},
    "in the Strait of Hormuz": {"phrase":"in the Strait of Hormuz","meaning":"ở eo biển Hormuz","lemma":"","level":"B2","type":"phrase","grammar":"prep + proper noun","token_meanings":{"in":"ở","the":"(mạo từ)","Strait":"eo biển","of":"của","Hormuz":"Hormuz"},"fixed_phrase":"","irregular":""},
    "a day earlier": {"phrase":"a day earlier","meaning":"một ngày trước đó","lemma":"","level":"B1","type":"phrase","grammar":"time expression","token_meanings":{"a":"một","day":"ngày","earlier":"trước đó"},"fixed_phrase":"","irregular":""}
  }
}

Input: "On Saturday morning, Bahrain reported strikes by Iranian drones, which the Iranian Revolutionary Guard Corps claimed targeted a U.S. terrorist army in the Gulf state."
Output:
{
  "sentence": "Vào sáng thứ Bảy, Bahrain báo cáo các cuộc không kích của máy bay không người lái Iran, mà Lực lượng Vệ binh Cách mạng Iran tuyên bố nhắm mục tiêu vào một quân đội khủng bố của Mỹ ở tiểu vương quốc Vùng Vịnh.",
  "words": {
    "On Saturday morning": {"phrase":"On Saturday morning","meaning":"vào sáng thứ Bảy","lemma":"","level":"A2","type":"phrase","grammar":"on + day + time = time adverb","token_meanings":{"On":"vào","Saturday":"thứ Bảy","morning":"sáng"},"fixed_phrase":"on + day = vào (NOT trên)","irregular":""},
    "Bahrain reported": {"phrase":"Bahrain reported","meaning":"Bahrain báo cáo","lemma":"report","level":"B1","type":"verb","grammar":"past simple (V2)","token_meanings":{"Bahrain":"Bahrain","reported":"báo cáo (V2)"},"fixed_phrase":"","irregular":""},
    "strikes by Iranian drones": {"phrase":"strikes by Iranian drones","meaning":"cuộc không kích bằng UAV Iran","lemma":"","level":"B2","type":"noun","grammar":"noun phrase + by-agent","token_meanings":{"strikes":"cuộc không kích","by":"bằng / của","Iranian":"Iran","drones":"máy bay không người lái"},"fixed_phrase":"","irregular":""},
    "which": {"phrase":"which","meaning":"mà","lemma":"which","level":"A2","type":"pronoun","grammar":"relative pronoun","token_meanings":{},"fixed_phrase":"","irregular":""},
    "the Iranian Revolutionary Guard Corps": {"phrase":"the Iranian Revolutionary Guard Corps","meaning":"Lực lượng Vệ binh Cách mạng Iran","lemma":"","level":"C1","type":"noun","grammar":"proper noun","token_meanings":{"the":"(mạo từ)","Iranian":"Iran","Revolutionary":"Cách mạng","Guard":"Vệ binh","Corps":"Lực lượng"},"fixed_phrase":"IRGC = Lực lượng Vệ binh Cách mạng Iran","irregular":""},
    "claimed targeted": {"phrase":"claimed targeted","meaning":"tuyên bố đã nhắm mục tiêu","lemma":"claim","level":"B2","type":"verb","grammar":"past simple + V3 complement","token_meanings":{"claimed":"tuyên bố (V2)","targeted":"nhắm mục tiêu (V3)"},"fixed_phrase":"claim + V3 = tuyên bố đã làm gì","irregular":""},
    "a U.S. terrorist army": {"phrase":"a U.S. terrorist army","meaning":"một quân đội khủng bố của Mỹ","lemma":"","level":"B2","type":"noun","grammar":"noun phrase","token_meanings":{"a":"một","U.S.":"Hoa Kỳ","terrorist":"khủng bố","army":"quân đội"},"fixed_phrase":"","irregular":""},
    "in the Gulf state": {"phrase":"in the Gulf state","meaning":"ở tiểu vương quốc Vùng Vịnh","lemma":"","level":"B2","type":"phrase","grammar":"prep + noun phrase","token_meanings":{"in":"ở","the":"(mạo từ)","Gulf":"Vùng Vịnh","state":"tiểu vương quốc"},"fixed_phrase":"","irregular":""}
  }
}

RETURN FORMAT — ONLY valid JSON, no markdown:
{
  "sentence": "Vietnamese translation of the full sentence",
  "words": {
    "EXACT_TEXT_FROM_SENTENCE": {
      "phrase": "same as key",
      "meaning": "1-4 word Vietnamese meaning (precise in context)",
      "lemma": "base form of main verb or empty",
      "level": "A1|A2|B1|B2|C1|C2",
      "type": "noun|verb|adjective|adverb|pronoun|preposition|conjunction|article|auxiliary|phrasal verb|phrase",
      "grammar": "specific label e.g. past simple (V2) / passive (be+V3) / prep + day / proper noun / etc.",
      "token_meanings": {"each_token_in_phrase": "its Vietnamese meaning"},
      "fixed_phrase": "usage note or empty",
      "irregular": "V1→V2→V3 for irregular verbs or empty"
    }
  }
}

STRICT VALIDATION before returning:
1. Every word in "${sentence}" must be a key OR appear in some token_meanings
2. No phrasal verb split: if verb+particle are adjacent, they MUST be one key
3. "on" before Mon/Tue/Wed/Thu/Fri/Sat/Sun → token_meanings["on"]="vào" (NEVER "trên")
4. "The/the" before country/organization → token_meanings["The"]="(mạo từ)" (NEVER "cái")
5. Phrasal verb meaning = whole-phrase Vietnamese, not literal translation of individual words`;
}

const ANALYZE_SYSTEM = "You are a linguistic analyzer. Return complete valid JSON only. No markdown. No truncation.";

// Các prompt ngắn (giải thích từ/câu/cụm từ) — gộp lại vì nội dung tương tự nhau giữa các vị trí trong code gốc.
function buildWordTipPrompt(word, sentenceContext) {
  return `Explain the word/phrase "${word}" for a Vietnamese B1-B2 learner. Answer in Vietnamese, 2-3 lines. Focus on meaning in context, grammar form, usage tip.${sentenceContext ? ` Context: "${sentenceContext}"` : ""}`;
}

function buildWordExplainPrompt(word, sentence) {
  return `Giải thích từ/cụm từ "${word}" trong câu sau cho người học tiếng Anh trình độ A2-B1 người Việt.
Câu: "${sentence}"
Trả lời bằng tiếng Việt theo đúng format này (mỗi mục xuống hàng):
📌 Nghĩa trong câu: [nghĩa cụ thể]
📐 Cấu trúc: [cấu trúc ngữ pháp nếu có, ví dụ: to + V, be able to, V-ing,...]
💡 Lưu ý: [điều quan trọng cần nhớ về từ/cụm này]`;
}

function buildPhraseExplainPrompt(phrase, context) {
  return `Giải thích cụm từ "${phrase}" trong câu sau cho người học tiếng Anh trình độ A2-B1 người Việt.

Câu: "${context}"

Trả lời bằng tiếng Việt theo format (mỗi mục xuống hàng):
📌 Nghĩa trong câu: [nghĩa cụ thể]
📐 Cấu trúc: [cấu trúc ngữ pháp nếu có]
💡 Lưu ý: [điều quan trọng cần nhớ]`;
}

function buildSentenceTipPrompt(sentence) {
  return `Explain this English sentence for a Vietnamese B1-B2 learner in Vietnamese. Be concise (3-5 lines max). Focus on: grammar structure, tense used, any special patterns. Sentence: "${sentence}"`;
}

const EXAM_SYSTEM = "You are an expert English exam creator. Return ONLY valid JSON. Never truncate output.";

export {
  buildAnalyzePrompt,
  ANALYZE_SYSTEM,
  buildWordTipPrompt,
  buildWordExplainPrompt,
  buildPhraseExplainPrompt,
  buildSentenceTipPrompt,
  EXAM_SYSTEM,
};
