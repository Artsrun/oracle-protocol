# Sources — fetch log (2026-11-13)

Every source in `data/evidence.js` was opened while building v2. This log records what was fetched and the passage
relied on. If a host blocked automated fetching, the canonical URL is cited and the copy actually read is listed.

| id | Canonical URL | Fetched via | Result | Passage relied on (paraphrase or short quote) |
|---|---|---|---|---|
| ftc6b | https://search.ftc.gov/system/files/ftc_gov/pdf/Social-Media-6b-Report-9-11-2024.pdf | same (curl + pdftotext, 2.9 MB) | 200 | Nine companies; data "from and about users and non-users"; "information gathered passively or inferred"; data purchased from data brokers for targeted ads; interest categories (recipes → "Food and Drink"); engagement/user metrics/attributes used to decide content; pixels/SDKs; "No Company provided a comprehensive list of all third-party entities…"; ownership: Instagram acquired by Meta 2012, WhatsApp part of Meta family, YouTube wholly owned by Google LLC (Alphabet parent), Amazon parent of Twitch, ByteDance parent of TikTok LLC. The ftc.gov HTML landing page URL returned 404 to the fetcher; the PDF on search.ftc.gov was used. |
| google-pp | https://policies.google.com/privacy | same (curl) | 200 | "Effective October 16, 2026"; activity collected incl. "Terms you search for", "Videos you watch", "Purchase activity", "People with whom you communicate"; used "to do things like recommend a YouTube video"; location for "ads based on your location"; ad settings in My Ad Center. |
| openai-pp | https://openai.com/policies/privacy-policy/ | WebFetch | 200 | "Updated: September 10, 2026"; Content = prompts, files, images, audio; "may use Content … to train the models"; opt-out; "information to establish your identity or age"; "estimate your age". |
| ftc-alexa | https://search.ftc.gov/system/files/ftc_gov/pdf/Amazon-Complaint-%28Dkt.1%29.pdf | same (curl + pdftotext) | 200 | Case 2:23-cv-00811, filed 05/31/23; default settings save recordings/transcripts indefinitely; used "to train and improve the Alexa product". Allegations. |
| ftc-kochava | https://search.ftc.gov/system/files/ftc_gov/pdf/1.%20Complaint.pdf | same (curl + pdftotext) | 200 | Case 2:22-cv-00377, filed 08/29/22; "location data broker"; purchases data from other brokers; timestamped lat/long tied to MAIDs; sensitive locations; AWS Marketplace listing. Allegations. |
| yt-blog | https://blog.youtube/inside-youtube/on-youtubes-recommendation-system/ | WebFetch | 200 | Sep 15, 2021; "Recommendations drive a significant amount of the overall viewership on YouTube, even more than channel subscriptions or search." |
| covington16 | https://research.google/pubs/deep-neural-networks-for-youtube-recommendations/ | WebFetch | 200 | Abstract: two-stage — deep candidate generation, separate deep ranking model. RecSys 2016. |
| kosinski13 | https://doi.org/10.1073/pnas.1218772110 | Europe PMC REST record PMC3625324 (pnas.org and pmc.ncbi.nlm.nih.gov returned 403 / bot challenge) | 200 | Abstract: 58,000+ volunteers; Likes predict sensitive attributes; Democrat vs Republican 85%. |
| huszar22 | https://doi.org/10.1073/pnas.2025334119 | Europe PMC REST record PMC8740571 | 200 | Abstract: ~2M accounts in reverse-chronological control; amplification measured; no evidence that far-left/far-right amplified more than moderates. |
| brady17 | https://doi.org/10.1073/pnas.1618923114 | Europe PMC REST record PMC5514704 | 200 | Abstract: n = 563,312; each moral-emotional word increased diffusion "by a factor of 20%". |
| x-algo | https://github.com/twitter/the-algorithm | raw README.md on raw.githubusercontent.com | 200 | user-signal-service: explicit (likes, replies) and implicit (profile visits, tweet clicks) signals; real-graph; SimClusters. |
| dsa38 | https://eur-lex.europa.eu/eli/reg/2022/2065/oj/eng | digitalacts.eu Article 38 page (EUR-Lex returned HTTP 202 with an empty body to curl and timed out in WebFetch) | 200 | "…shall provide at least one option for each of their recommender systems which is not based on profiling…" |

Not used: the FTC 2014 data-broker report (ftc.gov page 404'd and the PDF URL returned an HTML stub to the fetcher), the
X engineering blog (403), Meta's privacy policy (400). No claim in the app depends on them.
