const axios = require('axios');

const webhookUrl = "https://discord.com/api/webhooks/1474026660063084564/yjP7eQ-nYRRnrbBChvW95V7wjf6gDmCv_PO9wSl4kEEL2s7l46oa2c0rhTdmw7enf0XR";

const posts = [
  {
    page: "Slavka Channel",
    text: "Kapčiamiesčio infrastruktūra ir Lazdijų reindžeris",
    link: "https://www.facebook.com/reel/1410406840813537/",
    img: "https://scontent.fvno7-1.fna.fbcdn.net/v/t15.5256-10/631413229_1855678678465706_6647936971252890504_n.jpg?stp=dst-jpg_p960x960_tt6&_nc_cat=102&ccb=1-7&_nc_sid=5fad0e&_nc_ohc=CsXd1O3SOvkQ7kNvwExmj_t&_nc_zt=23&_nc_ht=scontent.fvno7-1.fna&oh=00_Aftu9AaywLP85oKn84gfUGquuNLC2O3Q-eRvRbMc4lwVFw&oe=699CD85B"
  },
  {
    page: "Slavka Channel",
    text: "Sakykit ką norit bet skamba kaip filmas apie budizmą. \"75 dienos meditacijų\"",
    link: "https://www.facebook.com/SlavkaChannel/posts/pfbid02YEK9CSVSjcyrJiKfEFqfwmND7aa546nAiiefA8eGWRD7yNuo4bEUcwQJZiSJeZx8l",
    img: "https://scontent.fvno7-1.fna.fbcdn.net/v/t39.30808-6/634172977_1427958762107460_2471902459114725495_n.jpg?stp=dst-jpg_s590x590_tt6&_nc_cat=105&ccb=1-7&_nc_sid=7b2446&_nc_ohc=23K4HQ8-XYwQ7kNvwFZb5dl&_nc_zt=23&_nc_ht=scontent.fvno7-1.fna&oh=00_Afuyc5DfaXUQlDCX06eopSw71IquDta433EMkQSX6EDAaQ&oe=699CDDB7"
  },
  {
    page: "Elinga Fomka",
    text: "Užgavėnės Salininkuose – akimirkos, kurios dar šildo širdį!",
    link: "https://www.facebook.com/reel/1241625874606233/",
    img: "https://scontent.fvno7-1.fna.fbcdn.net/v/t15.5256-10/637737608_1602485060992770_3247297166459835913_n.jpg?stp=dst-jpg_p960x960_tt6&_nc_cat=105&ccb=1-7&_nc_sid=5fad0e&_nc_ohc=nZdf5qE8ypYQ7kNvwEhO725&_nc_zt=23&_nc_ht=scontent.fvno7-1.fna&oh=00_AftBQQgUjki9UEWXPig5-Swm8GI0nQTS8oWtLH5dneoMrQ&oe=699CC93C"
  },
  {
    page: "Elinga Fomka",
    text: "Demokratai pasiryžę guldyti galvas už Skvernelį 😂 Nes be jo jie visi – niekas. Nei Lukas, nei Dundukas – visi tik figūrėlės jo šachmatų lentoje. Skvernelis jiems yra vi...",
    link: "https://www.facebook.com/elinga.fomka/posts/pfbid0MiA6wMgmNHvTB4mu9gt8At4Xus5ocJxePDpWizvdzTjJT9cKGSnGmqTWRkchDdLel",
    img: "https://scontent.fvno7-1.fna.fbcdn.net/v/t39.30808-6/475458117_4093208577594500_3030225184282361136_n.jpg?stp=dst-jpg_s600x600_tt6&_nc_cat=105&ccb=1-7&_nc_sid=7b2446&_nc_ohc=C6I_7hKAnP8Q7kNvwFv3P42&_nc_zt=23&_nc_ht=scontent.fvno7-1.fna&oh=00_AfDS9mX0q9u196_Y7h-33yXp-A0I2-o6p-U7h5D3nEoMrQ&oe=699CD94B"
  }
];

async function send() {
  for (const post of posts) {
    const payload = {
      embeds: [{
        title: `TESTAS: ${post.page}`,
        url: post.link,
        description: post.text,
        color: 3447003,
        timestamp: new Date().toISOString(),
        image: post.img ? { url: post.img } : null,
        footer: { text: "FB Notifier Test" }
      }]
    };
    try {
      await axios.post(webhookUrl, payload);
      console.log(`Sent: ${post.page}`);
    } catch (e) {
      console.error(`Error: ${e.message}`);
    }
  }
}

send();
