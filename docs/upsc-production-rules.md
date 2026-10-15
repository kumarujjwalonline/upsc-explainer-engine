# Production rules for the Upsc Explainers channel (from Ujjwal, 2026-10-13)

Ujjwal's words on these rules: "Indicative, not binding. Improvise as needed."
This file was copied from the rules of the first explainer channel on 2026-10-13 and adapted for UPSC topics. The pipeline reads it before every video. New rules from Ujjwal are added here with the date.

## Channel
- Channel: Upsc Explainers (YouTube). Audience: UPSC Civil Services aspirants (Prelims and Mains) and curious learners.
- Subjects: geography, international relations, polity, history, science and technology, environment and ecology, government schemes, economy, ethics and aptitude.
- Topic ideas: the UPSC topic list (upsc-explainer-topics.xlsx) made for this channel.

## Fixed settings
- Faceless only. No avatars, presenters or talking heads. Animated characters are allowed only to show scenarios, never as a presenter.
- Narration in conversational Hinglish: Hindi in Devanagari, English words in Latin script. Technical terms stay in English. All numbers, digits, operators and units are spoken in English.
- **Common English words stay in English.** Keep everyday English words that Indians normally say in English (e.g. weight, body, process, energy, study, result, example, daily, simple, actually, government, policy, scheme, court, budget) in English and in Latin script. Only translate a word into Hindi when the Hindi word is what people really say.
- **UPSC terms stay as the exam writes them.** Names of articles, acts, bodies and concepts stay in English (e.g. Article 21, Fundamental Rights, Directive Principles, Finance Commission, Monsoon trough). Explain each one the first time it appears.
- **Tone:** conversational yet professional, never casual. Use polite forms ("aap / kijiye"). No slang, no filler, no gimmicks, no jargon beyond the terms the lesson needs. Get straight to the point. No greetings in the hook.
- **Expression tags on every line.** Every narration line opens with exactly one expression tag in square brackets: [curious], [explaining], [measured], [thoughtful], [emphatic], [serious], [calm] or [confident].
- **[pause] tag.** Inside a line, [pause] marks the point where one sentence ends and the next begins. Each [pause] becomes exactly 0.75 seconds of silence and is never spoken. Never put it at the start or end of a line, because the pause between lines is automatic.
- **Voice (locked once approved):**
  - ElevenLabs voice "Kumar Ujjwal Hindi" (voice id mOvzppGwwdT8srvDVcZ9), model Eleven v3.
  - Settings: stability 0.5, similarity 0.75, style 0.3, speed 1.0, speaker boost on.
  - Fuller, heavier treatment on every line: trim silence, lower the pitch by up to 6% (target about 118–120 Hz), +3 dB at 120 Hz, +1.5 dB at 250 Hz, −1 dB at 4.2 kHz, 2:1 compression and a limiter.
  - 0.75 seconds of silence between lines.
- On-screen text is English only, including titles, labels, formulas, captions and the tracker.
- No background music unless requested. Use purposeful SFX only.
- Colours: deep navy background, white text, orange/yellow emphasis. Other colours only where they encode meaning.
- Aspect ratio 16:9 for long videos; 9:16 for Shorts, with a redesigned tracker.

## Content rules
1. Research from textbooks, standards and primary sources. For UPSC this means NCERT and standard textbooks, the Constitution of India and India Code, PIB, PRS Legislative Research, ministry and scheme websites, Supreme Court and High Court judgments, Economic Survey and Union Budget documents, RBI, Census and NSO data, and UN, treaty and international-organisation texts. Never invent facts, numbers, dates or references. Keep a source list with working URLs.
2. Structure: hook (no greetings), setup, one concept at a time, a re-hook every 20–35 seconds that moves the story forward, then a payoff.
3. Write for the ear: vary sentence lengths, use rhetorical questions and explain each new term immediately. Keep narration, production notes and on-screen text in separate fields.
4. Voice delivery: curious for the hook, warm for explanations, emphatic for key ideas, measured for numbers, calm for conclusions.
5. Visuals explain the narration (progressive diagrams, labels, motion); they don't decorate it. No long static slides.
6. Assets: check every licence individually and keep an asset register (URL, creator, licence, attribution).
7. **Right-side learning-progress tracker (mandatory):** a vertical checklist with three states. Done = green with a check. Current = orange with a subtle animation. Upcoming = muted. It stays in sync with the narration, and the percentage counts completed objectives, not elapsed time. Nothing crosses its border, the safe margins or the gap to the main canvas.
8. On-screen text is short, accurate, uses standard notation and is spell-checked.
9. Strict narration-to-graphics sync, verified with the real audio.
10. Numericals (economy, aptitude, science): known values → required quantity → formula → variables → substitution → steps → answer with units → interpretation. Check the arithmetic independently.
11. Formulas: purpose, origin or derivation, variables, assumptions, a worked example and an application. Never fake a derivation.
12. Purposeful cuts. SFX are synced to events, not put on every cut.
13. Readable, mobile-friendly text with safe margins.

## Visual rules (adapted for UPSC subjects)
14. **Show the process, not a slide.** Every process is shown step by step in motion, in sync with the narration:
    - Polity and governance: flow diagrams of the process (e.g. how a bill becomes law, how an amendment passes) and hub diagrams of institutions and their links.
    - History: timelines plus maps of where events happened.
    - Geography, environment and international relations: map animations (locations, routes, borders, rivers, regions, groupings of countries).
    - Economy and schemes: stats with their official source, flows of money or benefits, before/after comparisons.
    - Health, disease and biology topics: a 3D walk through the human body (real BodyParts3D meshes, CC BY 4.0), from start to end.
15. **Real screenshots of sources for every claim.** Whenever a study, report, article of the Constitution, act, judgment, scheme or official claim is mentioned, show a real screenshot of the source page: where it was published, by whom, when and why. If the publisher blocks capture, fall back to PubMed and then Europe PMC for studies, and to the Internet Archive copy of the same page for everything else. Never fake or recreate a source.
16. **Relatable real-life examples** from everyday Indian life, animated where useful.
17. **Physics and science concepts: 3D motion graphics** (molecules, forces, reactions, energy flows), not flat slides.
18. **Places: map animation** whenever a place is introduced or talked about.
19. **Real copyright-free footage where it fits.** Wikimedia Commons needs no key; use Pexels or Pixabay only if a key exists. Check relevance strictly, filter out news and violence, and credit every clip on screen.

## Shorts and pronunciation
20. **One Short per section**, about 1 minute each and at most 3 minutes, each covering one small concept completely.
21. **Claude checks every Short before it is shared**: it makes sense on its own, opens with a hook, ends on a payoff and doesn't refer to earlier parts of the long video.
22. **English words are checked against an Indian-English pronunciation dictionary** (e.g. fat = "फैट", weight = "वेट"). A wrongly spoken word is re-recorded; if it is still wrong, the voice is given the dictionary spelling. Every fix is saved for future videos.

## Staged workflow (stop for Ujjwal's approval after each stage)
1. Research and script, checked by Claude (approval 1)
2. Voice sample with audio check (approval 2)
3. Full render with sync check, thumbnail and Shorts (approval 3)
4. Upload to YouTube
At any approval Ujjwal can reply "stop". Every change request goes through Claude → patch → re-run of only that stage.

## Deliverables per video
Title options; research summary and sources; hook and retention plan; full Hinglish script; scene-by-scene storyboard; tracker checklist; English on-screen text; SFX cues; sync check; thumbnail; Shorts; YouTube title, description (sources and credits) and tags.

## Rules added later

23. **Geography: cinematic 3D map animation** (added by Ujjwal, 2026-10-14). For every geography topic, and whenever a place, region, route or landform matters to the explanation, explain it with full-screen 3D map motion graphics, never a static map:
    - **Fly in like Google Earth.** Start from a 3D globe or satellite view, zoom in smoothly to the place, then zoom back out to show where it sits in its region, country and the world. Use zoom in and zoom out every time the scale of the story changes.
    - **Real 3D terrain.** Show height and depth, so mountains, plateaus, valleys, rivers, coasts and the ocean floor look like real landforms. Tilt and orbit the camera where it helps the viewer understand.
    - **Animate the explanation on the map itself**, in sync with the narration: draw borders, trace rivers and routes, drop labelled pins on cities and points, highlight regions, and show movement (winds, ocean currents, monsoon, plate movement, migration, trade and shipping routes) as moving arrows or lines.
    - **Fill the whole screen.** The 3D animation covers the full frame, edge to edge (only the progress tracker on the right stays clear), never a small map in a corner.
    - **Smooth and readable.** Camera moves ease in and out and are never rushed. Hold each key view for 1–2 seconds so labels can be read. Labels are in English and large enough to read on a phone.
    - **Accurate and free.** Check names, borders, scale and directions against a standard atlas. India's borders always follow the official Survey of India map. Build the visuals from free, open data (OpenStreetMap, Natural Earth, NASA, ESA Copernicus and USGS satellite and elevation data) for a Google Earth-style look, and record each source and its attribution in the asset register.

24. **Long videos: 8–15 minutes** (added by Ujjwal, 2026-10-14). Each long video covers one UPSC topic in 8–15 minutes, split into 5–8 sections. Each section explains one concept completely, so it also works on its own as a Short (rule 20). Never pad a video to reach the length.

25. **Every line must be complete** (added by Ujjwal, 2026-10-14). Before a script goes for approval, Claude checks every narration line: each sentence finishes its thought, nothing stops halfway, no word the meaning depends on is missing, and the line still makes sense when heard on its own. In the audio check, any line the voice cut short or left unfinished is re-recorded.

26. **Never sound like a documentary** (added by Ujjwal, 2026-10-14). The whole video, hook included, must sound like a teacher talking directly to the viewer, not like a documentary voice-over. Speak to "aap", ask questions, use everyday examples and short, natural sentences. No slow, dramatic, third-person storytelling and no grand, heavy phrasing. Before approval, Claude checks every line for this and rewrites any line that sounds like documentary narration.

27. **The first hook line is the best line** (added by Ujjwal, 2026-10-14, updated the same day). The very first sentence of the video is the strongest line in the whole script. It presents a surprising question or a contradiction that makes the viewer need the answer, for example something most people believe that turns out to be wrong. A shocking fact, a striking number, a strongly negative statement or a reassuring promise can make it sharper. It must be true and sourced, never exaggerated or misleading, and the video must answer it.

28. **Voice tone: same as the Buddhism vs Jainism sample** (added by Ujjwal, 2026-10-14). Every UPSC video is voiced in the same tone as the approved Buddhism vs Jainism voice sample. This replaces the pitch lowering in the voice settings above:
    - **Model:** ElevenLabs Eleven v3, the newer and more expressive model, never Multilingual v2.
    - **No pitch shift.** Keep the voice at its natural pitch.
    - **Soften breaths, don't mute them.** Turn audible breaths down (about 20 dB) so the voice still sounds natural. The tools are in videos/buddhism-vs-jainism/tools/ in the project files (soften.py; breath_count.py to check the result).
    - **Sentence pauses stay at exactly 0.75 seconds** (pauses.py).
    - **Send samples as a web page with an audio player** (an Artifact), because MP3 files don't play on Ujjwal's phone.

29. **Timeline bar for any series of events** (added by Ujjwal, 2026-10-15). Whenever the video explains events that happened one after another, show a timeline across the bottom of the screen for that whole part of the explanation. It stays on screen from the first event to the last. Each event is a marked point with its date or year. Events already explained turn to a "done" colour, the event being explained now is highlighted, and upcoming events stay in a different, muted colour. It never covers the main visual or the progress tracker.

30. **Motion graphics for every statement, plus real b-roll** (added by Ujjwal, 2026-10-15). Every key statement gets its own motion graphic, so students see what is being said: numbers count up or are drawn to scale (a length is traced along the map with a running counter, for example 3,488 km along the LAC), comparisons animate side by side, and causes and effects appear step by step. Add real footage b-roll and real screenshots (news pages, official documents, photos of the actual places) wherever they help students understand, following rules 15 and 19.

31. **Shorts: a new visual every 1–3 seconds** (added by Ujjwal, 2026-10-15). Shorts need more photos and graphics than the long video, so each Short is re-edited for vertical viewing, not just cut from the long video. Something new appears on screen every 1–3 seconds to keep viewers watching: a real photo or footage clip, a map zoom or highlight, a number that counts up, a keyword pop-up, an icon, an arrow, or a side-by-side comparison. Every visual matches the exact words being spoken at that moment, so it explains rather than decorates. No shot stays unchanged for more than 3 seconds, and the first 2 seconds open with the strongest visual. Text stays large and inside the vertical safe area, clear of the captions and the platform buttons. Claude checks every Short frame by frame for gaps longer than 3 seconds before sending it for approval.

32. **Thumbnails: Ujjwal's photo and clear UPSC targeting** (added by Ujjwal, 2026-10-15). The video itself stays faceless, but every thumbnail and Short cover uses Ujjwal's photo for branding, so students recognise the channel. Always use this standard photo:
   - Background-removed cutout: https://raw.githubusercontent.com/kumarujjwalonline/upsc-explainer-engine/claude/project-thread-vqzn0g/public/branding/ujjwal-thumbnail-cutout.png (original: public/branding/ujjwal-thumbnail-photo.png in the same folder; project files copy: branding/ujjwal-tutor-cutout-3.png).
   - Layout (1280×720): the photo on the right like a tutor explaining, with a soft orange glow and ring behind it and an "Ujjwal / UPSC EXPLAINERS" name plate. A short, catchy clickbait headline on the left in 2–4 big uppercase lines, key words in yellow or orange. A real visual from the video (the key map, photo or graphic) fills the background under a dark gradient.
   - UPSC targeting: a red badge with the exam stage (UPSC PRELIMS, UPSC MAINS or both) and a yellow badge with the GS paper(s) the topic belongs to (for example GS-2 · GS-3). A white bottom tag names the topic ("LAC EXPLAINED") and 2–3 subtopics.
   - Text in English only, readable on a phone, never covering the face. The headline must be true and the video must answer it.
   - Short covers (1080×1920) follow the same style.
