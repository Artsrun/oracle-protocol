/* ORACLE PROTOCOL v2 — chapter content. Factual statements reference ids in data/evidence.js.
 * label: VERIFIED | INFERRED | SIMULATED | UNKNOWN. Keep company-specific statements to what the source says. */
(function (root) {
  const OFFERS = [
    { id: 'social', title: 'Social platforms', give: 'identity, relationships, activity', get: 'connection, visibility, community',
      documented: { label: 'VERIFIED', text: 'The FTC\u2019s 2024 staff study of nine social media and video services found they collected data from and about users <em>and non-users</em> \u2014 personal and demographic information, interests, behaviours and activity elsewhere on the internet \u2014 including information inferred or bought from data brokers.', src: ['ftc6b'] },
      pattern: { label: 'INFERRED', text: 'Because a profile is built from both what you post and what others do around you, opting out personally does not fully remove you from the graph.' } },
    { id: 'free', title: 'Free services', give: 'searches, views, purchases, usage', get: 'search, maps, video, mail at no price',
      documented: { label: 'VERIFIED', text: 'Google\u2019s privacy policy lists activity it collects \u2014 terms you search for, videos you watch, purchase activity, people you communicate with \u2014 and says it uses activity to do things like recommend a YouTube video, and may show personalized ads; ad personalization can be changed in My Ad Center.', src: ['google-pp'] },
      pattern: { label: 'INFERRED', text: 'The price of an ad-funded service is paid in attention and behavioural data; the exchange rate is set by the provider, not the visitor.' } },
    { id: 'ai', title: 'AI assistants', give: 'prompts, files, context, voice', get: 'answers, drafting, analysis',
      documented: { label: 'VERIFIED', text: 'OpenAI\u2019s US privacy policy says it collects the prompts, files, images and audio you provide as \u201cContent\u201d, may use Content to train its models, and offers an opt-out of that training use.', src: ['openai-pp'] },
      pattern: { label: 'INFERRED', text: 'Conversation is unusually rich context: people disclose goals, worries and plans in their own words, often more than a form would ask.' } },
    { id: 'devices', title: 'Smart devices', give: 'voice, location, surroundings', get: 'hands-free help, automation',
      documented: { label: 'VERIFIED', text: 'In 2023 the U.S. DOJ, on behalf of the FTC, <em>alleged</em> that Alexa\u2019s default settings kept voice recordings and transcripts indefinitely and that Amazon used them to train and improve Alexa (allegations, not court findings).', src: ['ftc-alexa'] },
      pattern: { label: 'INFERRED', text: 'Devices placed in homes observe the people around them, not only the account holder.' } },
    { id: 'identity', title: 'Identity checks', give: 'ID documents, age, verified phone', get: 'continued account access',
      documented: { label: 'VERIFIED', text: 'OpenAI\u2019s privacy policy describes collecting information you or a vendor provide \u201cto establish your identity or age\u201d and estimating age to give an age-appropriate experience.', src: ['openai-pp'] },
      pattern: { label: 'INFERRED', text: 'Identity checks are increasingly a condition of access rather than an optional feature; refusing usually means losing the service.' } },
    { id: 'entertainment', title: 'Entertainment', give: 'attention, watch time, reactions', get: 'an endless, personalized feed',
      documented: { label: 'VERIFIED', text: 'YouTube\u2019s VP of Engineering wrote that recommendations drive a significant amount of overall viewership \u2014 more than channel subscriptions or search.', src: ['yt-blog'] },
      pattern: { label: 'INFERRED', text: 'When a feed, not the viewer, chooses most of what is watched next, attention itself becomes the traded good.' } }
  ];

  const EXCHANGE_DIMS = [
    { id: 'd', name: 'Disclosure', hint: 'how much you hand over' },
    { id: 'c', name: 'Convenience', hint: 'how much effort it saves' },
    { id: 'p', name: 'Personalization', hint: 'how tailored the service becomes' },
    { id: 'y', name: 'Platform dependency', hint: 'how hard it is to leave' },
    { id: 'x', name: 'Potential exposure', hint: 'how many parties could see it' },
    { id: 'i', name: 'Attention influence', hint: 'how much the service steers what you see' }
  ];

  // Illustrative model. Weights are design assumptions, shown verbatim in the UI.
  const EXCHANGE_MODEL = [
    { id: 'value', name: 'Perceived value', formula: '0.5\u00b7Convenience + 0.5\u00b7Personalization', f: v => 0.5 * v.c + 0.5 * v.p },
    { id: 'resolution', name: 'Profile resolution', formula: '0.5\u00b7Disclosure + 0.3\u00b7Personalization + 0.2\u00b7Dependency', f: v => 0.5 * v.d + 0.3 * v.p + 0.2 * v.y },
    { id: 'surface', name: 'Exposure surface', formula: 'Disclosure \u00d7 Exposure / 100', f: v => v.d * v.x / 100 },
    { id: 'lockin', name: 'Steering loop', formula: '0.6\u00b7Influence + 0.4\u00b7Dependency', f: v => 0.6 * v.i + 0.4 * v.y }
  ];

  const FOOTPRINT = [
    { id: 'identity', name: 'Identity', observed: 'name, email, phone, date of birth, ID document', derived: 'age band, gender, household role', unknown: 'how long each copy is retained by every recipient',
      use: 'account security, age gating, ad audience matching', doc: { label: 'VERIFIED', text: 'Most companies in the FTC study collected or inferred demographic information, most often age, gender and language; some inferred household education, income, marital or parental status.', src: ['ftc6b'] },
      control: 'Account settings; data-access and deletion requests where law provides them.', controlLabel: 'INFERRED' },
    { id: 'location', name: 'Location', observed: 'GPS fixes, IP-derived area, Wi-Fi/Bluetooth proximity', derived: 'home, work, routines, visits to sensitive places', unknown: 'which brokers hold a given device\u2019s history',
      use: 'local results, ads based on location, foot-traffic analytics', doc: { label: 'VERIFIED', text: 'The FTC alleged that Kochava sold timestamped precise location linked to mobile advertising IDs that could be used to track people to clinics, places of worship and shelters (allegations).', src: ['ftc-kochava'] },
      control: 'OS location permission per app; resetting or disabling the advertising ID.', controlLabel: 'INFERRED' },
    { id: 'relationships', name: 'Social relationships', observed: 'contacts, follows, messages-with, tags', derived: 'closeness, community membership, influence', unknown: 'whether non-users\u2019 uploaded contacts are retained',
      use: 'friend suggestions, ranking of whose posts you see', doc: { label: 'VERIFIED', text: 'X\u2019s published ranking code includes a model that predicts the likelihood of one user interacting with another, and community embeddings (SimClusters).', src: ['x-algo'] },
      control: 'Contact-sync toggles; limiting who can find you by phone/email.', controlLabel: 'INFERRED' },
    { id: 'interests', name: 'Interests', observed: 'likes, searches, dwell time, follows', derived: 'interest segments, personality and political leaning', unknown: 'the full list of segments a platform has assigned you',
      use: 'ad targeting, recommendations', doc: { label: 'VERIFIED', text: 'Researchers predicted sensitive traits, including political views, from Facebook Likes alone (58,000+ volunteers).', src: ['kosinski13'] },
      control: 'Ad-interest settings — Google says ad personalization can be controlled in My Ad Center.', controlLabel: 'VERIFIED', controlSrc: ['google-pp'] },
    { id: 'purchases', name: 'Purchases', observed: 'orders, payment events, loyalty cards', derived: 'income band, life events, propensity to buy', unknown: 'exact data-broker sources merged into a profile',
      use: 'ad targeting and measurement', doc: { label: 'VERIFIED', text: 'Most companies with an advertising service in the FTC study bought data sets from data brokers and others (e.g. household income, location, interests) and used them for targeted advertising.', src: ['ftc6b'] },
      control: 'Data-broker opt-outs where offered; limiting loyalty-program linkage.', controlLabel: 'INFERRED' },
    { id: 'conversations', name: 'Conversations', observed: 'messages, prompts, voice commands', derived: 'intent, sentiment, topics of concern', unknown: 'which conversations end up in training sets',
      use: 'service delivery, safety, model training', doc: { label: 'VERIFIED', text: 'OpenAI states it may use the Content you provide to train its models and offers an opt-out.', src: ['openai-pp'] },
      control: 'OpenAI states you can choose whether your Content is used to train its models.', controlLabel: 'VERIFIED', controlSrc: ['openai-pp'] },
    { id: 'surroundings', name: 'Visual surroundings', observed: 'photos, camera metadata, smart-camera footage', derived: 'objects, places, who is present', unknown: 'what is extracted from images beyond the stated features',
      use: 'search, organisation, safety features', doc: { label: 'INFERRED', text: 'Images carry context beyond their subject (other people, rooms, documents, EXIF location). This chapter cites no source for any specific company\u2019s image analysis.' },
      control: 'Camera permission per app; stripping location metadata before sharing.', controlLabel: 'INFERRED' },
    { id: 'attention', name: 'Attention patterns', observed: 'watch time, scroll speed, pauses, clicks', derived: 'engagement propensity, what holds you', unknown: 'the exact weights any proprietary ranker gives these signals',
      use: 'ranking what you see next', doc: { label: 'VERIFIED', text: 'Most companies in the FTC study used engagement, user metrics and attributes (language, location, interests, device) to decide what content to show.', src: ['ftc6b'] },
      control: 'In the EU, very large platforms must offer at least one recommender option not based on profiling.', controlLabel: 'VERIFIED', controlSrc: ['dsa38'] }
  ];

  const MACHINE = [
    { id: 'activity', name: 'Human activity', text: 'Searching, posting, watching, moving, talking to an assistant.', claim: { label: 'INFERRED', text: 'Every later stage depends on this one; it is also where the visitor has the most control.' } },
    { id: 'collection', name: 'Data collection', text: 'First-party logs, SDKs and pixels in other apps and sites, purchased data sets.', claim: { label: 'VERIFIED', text: 'The FTC found some companies offered tracking pixels and SDKs that transmit information about users\u2019 actions on other sites and apps back to the platform.', src: ['ftc6b'] } },
    { id: 'combination', name: 'Processing / combination', text: 'Joining sources by account, device ID, email or phone.', claim: { label: 'VERIFIED', text: 'Kochava is alleged to have bought data from other brokers and sold location feeds keyed to advertising IDs.', src: ['ftc-kochava'] } },
    { id: 'inference', name: 'Inference / profile', text: 'Interest segments, demographics, propensities.', claim: { label: 'VERIFIED', text: 'Platforms in the FTC study assigned users to interest categories from their activity (e.g. engaging with recipes \u2192 \u201cFood and Drink\u201d).', src: ['ftc6b'] } },
    { id: 'recommendation', name: 'Recommendation', text: 'Candidate generation, then ranking.', claim: { label: 'VERIFIED', text: 'YouTube\u2019s published system has a candidate-generation model followed by a separate ranking model.', src: ['covington16'] } },
    { id: 'allocation', name: 'Attention allocation', text: 'What reaches the top of the feed receives most of the attention.', claim: { label: 'VERIFIED', text: 'A randomized experiment on Twitter found personalized ranking amplified some content relative to a chronological feed.', src: ['huszar22'] } },
    { id: 'further', name: 'Further activity', text: 'Reactions to what was shown become new signals.', claim: { label: 'INFERRED', text: 'This closes the loop: the system learns from behaviour it helped shape. How strongly this feedback operates on a given platform is not public.' } }
  ];

  // Ecosystem map. Only relations with a source are VERIFIED; others are typed UNKNOWN/INFERRED explicitly.
  const ROLES = [
    { id: 'collectors', name: 'Data collectors' }, { id: 'processors', name: 'Data processors / brokers' },
    { id: 'ads', name: 'Advertising intermediaries' }, { id: 'identity', name: 'Identity providers' },
    { id: 'platforms', name: 'Content & social platforms' }, { id: 'infra', name: 'AI & cloud infrastructure' }
  ];
  const ENTITIES = [
    { id: 'meta', name: 'Meta Platforms', roles: ['platforms'], src: ['ftc6b'] },
    { id: 'instagram', name: 'Instagram', roles: ['platforms'], src: ['ftc6b'] },
    { id: 'whatsapp', name: 'WhatsApp', roles: ['platforms'], src: ['ftc6b'] },
    { id: 'google', name: 'Google', roles: ['platforms', 'ads', 'collectors'], src: ['google-pp'] },
    { id: 'youtube', name: 'YouTube', roles: ['platforms'], src: ['ftc6b', 'yt-blog'] },
    { id: 'amazon', name: 'Amazon', roles: ['platforms', 'collectors'], src: ['ftc6b', 'ftc-alexa'] },
    { id: 'twitch', name: 'Twitch', roles: ['platforms'], src: ['ftc6b'] },
    { id: 'bytedance', name: 'ByteDance', roles: ['platforms'], src: ['ftc6b'] },
    { id: 'tiktok', name: 'TikTok', roles: ['platforms'], src: ['ftc6b'] },
    { id: 'x', name: 'X Corp.', roles: ['platforms'], src: ['ftc6b', 'x-algo'] },
    { id: 'openai', name: 'OpenAI', roles: ['infra', 'collectors'], src: ['openai-pp'] },
    { id: 'kochava', name: 'Kochava', roles: ['processors'], src: ['ftc-kochava'] },
    { id: 'idvendor', name: 'Identity/age-verification vendors (unnamed)', roles: ['identity'], src: ['openai-pp'] },
    { id: 'brokers', name: '\u201cData brokers and others\u201d (unnamed)', roles: ['processors'], src: ['ftc6b'] }
  ];
  const RELATIONS = [
    { from: 'meta', to: 'instagram', type: 'ownership', label: 'VERIFIED', note: 'Instagram acquired by Meta in 2012.', src: ['ftc6b'] },
    { from: 'meta', to: 'whatsapp', type: 'ownership', label: 'VERIFIED', note: 'WhatsApp Inc. is part of the Meta corporate family.', src: ['ftc6b'] },
    { from: 'google', to: 'youtube', type: 'ownership', label: 'VERIFIED', note: 'YouTube, LLC is wholly owned by Google LLC; Alphabet is the ultimate parent.', src: ['ftc6b'] },
    { from: 'amazon', to: 'twitch', type: 'ownership', label: 'VERIFIED', note: 'Amazon.com, Inc. is the parent company of Twitch.', src: ['ftc6b'] },
    { from: 'bytedance', to: 'tiktok', type: 'ownership', label: 'VERIFIED', note: 'ByteDance Ltd. is the ultimate parent of TikTok LLC.', src: ['ftc6b'] },
    { from: 'brokers', to: 'Studied platforms with ad services', type: 'data purchase', label: 'VERIFIED', note: 'Most studied companies with an ad service bought data sets from data brokers and others. The report does not name which broker sold to which company.', src: ['ftc6b'] },
    { from: 'Studied platforms', to: 'Third parties', type: 'sharing', label: 'UNKNOWN', note: 'No company in the FTC study provided a comprehensive list of third parties it shared personal information with.', src: ['ftc6b'] },
    { from: 'kochava', to: 'Customers', type: 'data sale', label: 'VERIFIED', note: 'FTC alleges Kochava sold location data feeds to customers, including via a cloud marketplace listing (allegation).', src: ['ftc-kochava'] },
    { from: 'Any two companies named on this page', to: '', type: 'data sharing', label: 'UNKNOWN', note: 'This map does not assert data-sharing between any two named companies; no source used here documents such a relationship.' }
  ];

  const LAB_ITEMS = [
    // Fictional feed items. Attribute values are invented for the simulation.
    { id: 'A', title: 'Calm explainer on tax forms', emo: 0.15, rel: 0.75, rec: 0.4 },
    { id: 'B', title: 'Outraged thread about a rival group', emo: 0.95, rel: 0.45, rec: 0.9 },
    { id: 'C', title: 'Friend\u2019s holiday photos', emo: 0.45, rel: 0.6, rec: 0.7 },
    { id: 'D', title: 'Breaking rumour, unverified', emo: 0.85, rel: 0.4, rec: 1.0 },
    { id: 'E', title: 'Long-form science report', emo: 0.2, rel: 0.55, rec: 0.2 },
    { id: 'F', title: 'Meme in your niche', emo: 0.6, rel: 0.85, rec: 0.6 },
    { id: 'G', title: 'Local council notice', emo: 0.1, rel: 0.5, rec: 0.5 },
    { id: 'H', title: 'Celebrity feud clip', emo: 0.8, rel: 0.3, rec: 0.8 },
    { id: 'I', title: 'Tutorial you searched for last week', emo: 0.2, rel: 0.95, rec: 0.1 },
    { id: 'J', title: 'Fear-framed health claim', emo: 0.9, rel: 0.5, rec: 0.6 }
  ];

  root.OracleContent = { OFFERS, EXCHANGE_DIMS, EXCHANGE_MODEL, FOOTPRINT, MACHINE, ROLES, ENTITIES, RELATIONS, LAB_ITEMS };
  if (typeof module !== 'undefined') module.exports = root.OracleContent;
})(typeof window !== 'undefined' ? window : globalThis);
