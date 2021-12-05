const axios = require("axios");
const fs = require('fs');
require('dotenv').config();

const lang = ["FR", "ES", "IT", "DE", "RO"];

axios.defaults.baseURL = "https://" + process.env.DEEPL_URL;
axios.defaults.headers.common['Authorization'] = "DeepL-Auth-Key " + process.env.DEEPL_KEY;

let file = fs.readFileSync('en.json');
let data = JSON.parse(file);

lang.forEach(async (value) => {
    console.log("--- Language: " + value + " ---");
    let file;
    try {
        file = fs.readFileSync(value + '.json');
    } catch (err) {
        if (err.code === 'ENOENT') {
            fs.writeFileSync(value + '.json', "{}");
            file = fs.readFileSync(value + '.json');
        } else {
            throw err;
        }
    }

    let langData = JSON.parse(file);
    let missingKeys = returnMissingKeys(data, langData);
    console.log("Missing keys length: " + Object.keys(missingKeys).length);
    if (Object.keys(missingKeys).length / 50 < 1) {
        const params = new URLSearchParams();
        params.append("target_lang", value);
        const langDataLength = langData.length;
        Object.keys(missingKeys).forEach((key) => {
            params.append("text", data[key]);
            langData[key] = "";
        });
        console.log(params);
        const result = await axios.post("/v2/translate", params);
        for (let i = 0; i < result.data.translations.length; i++) {
            langData[langDataLength + i] = result.data.translations[i].text;
        }
    } else {
        let requests = [];
        let requestLengths = [];
        for (let i = 0; i < (Math.ceil(Object.keys(missingKeys).length / 50)); i++) {
            const params = new URLSearchParams();
            params.append("target_lang", value);
            //params.append("source_lang", "EN-GB");
            for (var j = 0; j < (Object.keys(missingKeys).length - (50 * i)) && j < 50; j++) {
                params.append("text", data[Object.keys(missingKeys)[j + i * 50]]);
                langData[Object.keys(missingKeys)[j + i * 50]] = "";
            }
            requests.push(axios.post("/v2/translate", params));
        }
        const results = await Promise.all(requests).catch((err) => { console.log(err) });
        for (let i = 0; i < results.length; i++) {
            for (let j = 0; j < results[i].data.translations.length; j++) {
                langData[Object.keys(missingKeys)[i * 50 + j]] = results[i].data.translations[j].text;
            }
        }
    }
    fs.writeFileSync(value + '.json', JSON.stringify(langData));
});


function returnMissingKeys(reference, data) {
    if (!Array.isArray(data)) {
        return reference;
    } else {
        return data.filter((val) => !reference[val]);
    }
}