/* ORACLE PROTOCOL v2 — evidence layer.
 * Every source below was fetched on 2026-11-13 while building this release.
 * `url` is the canonical address shown to visitors. `verifiedVia` is the address actually fetched when the
 * canonical host blocked automated access (it is identical to `url` otherwise).
 * Labels: VERIFIED = directly supported by the cited source. INFERRED = reasoned interpretation of documented
 * evidence. SIMULATED = illustrative model or hypothetical. UNKNOWN = cannot be established from available evidence.
 */
(function (root) {
  const ACCESSED = '2026-11-13';
  const SOURCES = [
    { id: 'ftc6b', short: 'FTC 6(b) 2024', title: 'A Look Behind the Screens: Examining the Data Practices of Social Media and Video Streaming Services (Staff Report)', publisher: 'U.S. Federal Trade Commission', date: '2024-09', type: 'Regulator report',
      url: 'https://search.ftc.gov/system/files/ftc_gov/pdf/Social-Media-6b-Report-9-11-2024.pdf',
      supports: '6(b) study of nine services (Amazon/Twitch, Facebook, YouTube, Twitter/X, Snap, ByteDance/TikTok, Discord, Reddit, WhatsApp): collection of data from and about users and non-users including inferred data; purchase of data-broker data sets for ad targeting; interest categories inferred from activity; use of engagement, user metrics and attributes to decide what content to show; no company gave a comprehensive list of third parties it shared personal information with; ownership facts (Meta–Instagram/WhatsApp, Google–YouTube, Amazon–Twitch, ByteDance–TikTok).' },
    { id: 'google-pp', short: 'Google Privacy Policy 2026', title: 'Google Privacy Policy (effective October 16, 2026)', publisher: 'Google', date: '2026-10-16', type: 'Privacy policy',
      url: 'https://policies.google.com/privacy',
      supports: 'Google collects activity such as terms you search for, videos you watch, purchase activity and people you communicate with, and uses it to e.g. recommend YouTube videos; collects location information, including for ads based on location; ad personalization is controllable in My Ad Center.' },
    { id: 'openai-pp', short: 'OpenAI Privacy Policy 2026', title: 'US Privacy Policy (updated September 10, 2026)', publisher: 'OpenAI', date: '2026-09-10', type: 'Privacy policy',
      url: 'https://openai.com/policies/privacy-policy/',
      supports: 'Collects prompts and uploaded files/images/audio as "Content"; may use Content to train models, with an opt-out; determines general location from IP; may collect information to establish identity or age, and estimates age.' },
    { id: 'ftc-alexa', short: 'US v. Amazon 2023', title: 'United States v. Amazon.com, Inc. — Complaint (No. 2:23-cv-00811, W.D. Wash.)', publisher: 'U.S. Department of Justice / Federal Trade Commission', date: '2023-05-31', type: 'Court filing (allegations)',
      url: 'https://search.ftc.gov/system/files/ftc_gov/pdf/Amazon-Complaint-%28Dkt.1%29.pdf',
      supports: 'Alleges that Alexa\'s default settings saved voice recordings and transcripts indefinitely, that Amazon used them to train and improve Alexa, and that it failed to delete voice and geolocation data on request. These are allegations, not court findings.' },
    { id: 'ftc-kochava', short: 'FTC v. Kochava 2022', title: 'FTC v. Kochava Inc. — Complaint (No. 2:22-cv-377, D. Idaho)', publisher: 'U.S. Federal Trade Commission', date: '2022-08-29', type: 'Court filing (allegations)',
      url: 'https://search.ftc.gov/system/files/ftc_gov/pdf/1.%20Complaint.pdf',
      supports: 'Alleges Kochava is a location data broker selling timestamped precise geolocation linked to mobile advertising IDs, which could be used to track people to sensitive locations. Allegations, not court findings.' },
    { id: 'yt-blog', short: 'YouTube 2021', title: 'On YouTube\u2019s recommendation system', publisher: 'YouTube Official Blog (Cristos Goodrow, VP Engineering)', date: '2021-09-15', type: 'Platform documentation',
      url: 'https://blog.youtube/inside-youtube/on-youtubes-recommendation-system/',
      supports: 'Recommendations drive a significant amount of overall viewership, more than subscriptions or search; the system compares your viewing habits with similar viewers\u2019 to suggest content.' },
    { id: 'covington16', short: 'Covington 2016', title: 'Deep Neural Networks for YouTube Recommendations', publisher: 'Covington, Adams, Sargin — ACM RecSys 2016 (Google Research)', date: '2016', type: 'Peer-reviewed paper',
      url: 'https://research.google/pubs/deep-neural-networks-for-youtube-recommendations/',
      supports: 'Industrial recommender split into candidate generation and a separate ranking model.' },
    { id: 'kosinski13', short: 'Kosinski 2013', title: 'Private traits and attributes are predictable from digital records of human behavior', publisher: 'Kosinski, Stillwell, Graepel — PNAS 110(15)', date: '2013-04', type: 'Peer-reviewed paper',
      url: 'https://doi.org/10.1073/pnas.1218772110',
      verifiedVia: 'https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=PMCID:PMC3625324&resultType=core&format=json',
      supports: 'Facebook Likes from 58,000+ volunteers predicted sensitive attributes (e.g. political views: 85% discrimination accuracy) — observed behaviour can yield derived inferences.' },
    { id: 'huszar22', short: 'Husz\u00e1r 2022', title: 'Algorithmic amplification of politics on Twitter', publisher: 'Husz\u00e1r et al. — PNAS 119(1)', date: '2022-01', type: 'Peer-reviewed paper',
      url: 'https://doi.org/10.1073/pnas.2025334119',
      verifiedVia: 'https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=PMCID:PMC8740571&resultType=core&format=json',
      supports: 'Randomized experiment with ~2 million accounts held on a reverse-chronological feed: personalized ranking measurably amplifies some content relative to a chronological baseline; amplification of far-left/far-right over moderates was not found.' },
    { id: 'brady17', short: 'Brady 2017', title: 'Emotion shapes the diffusion of moralized content in social networks', publisher: 'Brady et al. — PNAS 114(28)', date: '2017-07', type: 'Peer-reviewed paper',
      url: 'https://doi.org/10.1073/pnas.1618923114',
      verifiedVia: 'https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=PMCID:PMC5514704&resultType=core&format=json',
      supports: 'In 563,312 messages on three polarizing issues, each additional moral-emotional word was associated with ~20% higher diffusion (observational, within this sample).' },
    { id: 'x-algo', short: 'X the-algorithm', title: 'twitter/the-algorithm — README', publisher: 'X Corp. (open-source repository)', date: '2023-03 (repository; README fetched 2026-11-13)', type: 'Platform documentation / source code',
      url: 'https://github.com/twitter/the-algorithm',
      verifiedVia: 'https://raw.githubusercontent.com/twitter/the-algorithm/main/README.md',
      supports: 'The published For You pipeline retrieves explicit (likes, replies) and implicit (profile visits, post clicks) user signals and uses models such as real-graph (likelihood of interacting with another user) and SimClusters (community embeddings).' },
    { id: 'dsa38', short: 'DSA Art. 38', title: 'Regulation (EU) 2022/2065 (Digital Services Act), Article 38 \u2014 Recommender systems', publisher: 'European Union (text via digitalacts.eu)', date: '2022-10-19', type: 'Law',
      url: 'https://eur-lex.europa.eu/eli/reg/2022/2065/oj/eng',
      verifiedVia: 'https://www.digitalacts.eu/regulation/digital-service-act/article/38/recommender-systems',
      supports: 'Very large online platforms and search engines must offer at least one recommender option not based on profiling.' }
  ];
  SOURCES.forEach(s => { s.accessed = ACCESSED; if (!s.verifiedVia) s.verifiedVia = s.url; });
  const byId = Object.fromEntries(SOURCES.map(s => [s.id, s]));

  const LABELS = {
    VERIFIED: 'Directly supported by the cited source.',
    INFERRED: 'Reasoned interpretation of documented evidence \u2014 not stated outright by a source.',
    SIMULATED: 'Illustrative model or hypothetical scenario \u2014 not a measurement of you or of any real system.',
    UNKNOWN: 'Cannot be established from available public evidence.'
  };

  const esc = (t) => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const badge = (label) => `<span class="prov prov-${label.toLowerCase()}" title="${esc(LABELS[label] || '')}">${label}</span>`;
  const cite = (ids) => (ids || []).map(id => {
    const s = byId[id];
    if (!s) throw new Error('Unknown source id ' + id);
    return `<button type="button" class="cite" data-source="${id}">[${esc(s.short)}]<span class="vh"> \u2014 open source: ${esc(s.title)}</span></button>`;
  }).join(' ');
  /** claim(label, html, sourceIds) — the only way chapters render factual statements. */
  const claim = (label, html, ids) => {
    if (label === 'VERIFIED' && !(ids && ids.length)) throw new Error('VERIFIED claim without source: ' + html);
    return `<p class="claim">${badge(label)} <span>${html}</span>${ids && ids.length ? ' ' + cite(ids) : ''}</p>`;
  };

  root.OracleEvidence = { SOURCES, byId, LABELS, badge, cite, claim, esc, ACCESSED };
  if (typeof module !== 'undefined') module.exports = root.OracleEvidence;
})(typeof window !== 'undefined' ? window : globalThis);
