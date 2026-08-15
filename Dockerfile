FROM node:18-bullseye-slim

# התקנת כרומיום והספריות הנדרשות
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-freefont-ttf \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /usr/src/app

COPY package*.json ./

# התקנה נקייה ללא סקריפטים נלווים שחוסמים את השרת
RUN npm install --omit=dev --ignore-scripts

COPY . .

CMD ["npm", "start"]
