---
title: Create a Custom Desktop Pet with GPT + Codex: Complete Workflow
summary: "I recently tried Codex's Pet feature and found that you can turn your own character into a desktop pet. The result is surprisingly fun, and the whole process is fairly simple."
author: evan
category: work
tags: [Work Notes]
createdAt: 2026-06-04 16:15:08
updatedAt: 2026-06-04 16:15:08
readingMinutes: 5
---
# Create a Custom Desktop Pet with GPT + Codex: Complete Workflow

I recently tried Codex's Pet feature and found that you can turn your own character into a desktop pet. The result is surprisingly fun.

**Prototype image:**
![DC393331-FE49-453B-B329-A46505B5B048](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/06/04/238384c4-dd32-482c-ab7e-dc2266eb2a97.png)

**Result:**

![Screenshot 2026-06-04 16.14.07](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/06/04/b34c66bc-1892-4a3a-acf0-71e4cb6fe6e2.png)

The whole process is not complicated. It roughly breaks down into three parts.

## Step 1: Prepare the Pet Artwork

First, prepare a PNG image with a transparent background.

Recommended workflow:

1. Prepare a photo of yourself.
2. Ask GPT to generate a chibi-style character.
3. Use GPT, Photoshop, RemoveBG, or similar tools to remove the background.
4. Export a transparent PNG.

### Example prompt

```text
Please generate a chibi-style character based on this photo.

Requirements:
- Preserve the person's facial features as much as possible
- Large eyes
- Chibi proportions
- Full-body character
- Keep the hairstyle and clothing characteristics
- Suitable for use as a desktop pet
- Transparent background
```

Eventually you should get:

```text
pet.png
```

A transparent background is very important. Otherwise, the generated pet will not look as good later.

---

## Step 2: Install the Codex Pet Skill

In Codex, enter:

```bash
$skill-installer hatch-pet
```

Wait for the installation to finish.

---

## Step 3: Reload the Skill

Open the command palette:

```text
Cmd + K
```

Then enter:

```text
Force Reload Skills
```

Reload the skill.

---

## Step 4: Create the Pet

In Codex, enter:

```text
Hatch Pet

I want to create a Codex pet based on this PNG image.

Please preserve the following features as much as possible:

- Long black hair
- Cat ears
- Cat tail
- Large eyes
- Colorful star stickers on the face
- A small white sticker on the nose
- Red fluffy hair clip
- Gray-and-white striped shirt

Requirements:

- Chibi style
- Pixel art style
- Desktop pet style
- Support idle animation
- Support walking animation
- Support blinking animation
- Support drag-state animation
- Look clear even at a small display size

Please generate asset files suitable for Codex Desktop Pet and automatically package them into the Codex pets directory.
```

Then confirm the action:

```text
Yes, go ahead.
```

---

## Step 5: Wake Up the Pet

After creation is complete, enter:

```text
/pet
```

This wakes up the pet.

In some versions, you can also use:

```text
Cmd + K
```

Then run:

```text
Wake Pet
```

to start the pet.

---

# Recommended Workflow

Compared with using the system's default pet directly, I recommend:

```text
Real photo
    ↓
GPT-generated chibi character
    ↓
Transparent PNG
    ↓
Codex Pet
    ↓
Custom desktop pet
```

This produces a pet with much more personality.

For example:

- Programmer-style character
- Anime-style character
- Catgirl-style character
- Dog-style character
- Game character
- Your own avatar

All of these can be turned into a custom desktop pet.

---

# Final Result

```text
Photo
    ↓
Chibi character
    ↓
Transparent PNG
    ↓
Codex generates animation
    ↓
Desktop pet
```

From a single photo to your own AI desktop pet, the whole process only takes a few minutes.
