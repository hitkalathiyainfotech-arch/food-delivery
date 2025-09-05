//*!* rapid api config 1000 request/month *!*

import axios from "axios";
import { config } from 'dotenv'; config();

const GST_API_HOST = "india-gstin-validator.p.rapidapi.com";
const GST_API_KEY = process.env.RAPIDAPI_KEY || "f3db12d99dmsh0a5a293a042f20cp10c76djsnd707e270b5f0";

async function validateGSTIN(gstin) {
    try {
        const response = await axios.get(`https://${GST_API_HOST}/validate?gstin=${String(gstin).toUpperCase()}`, {
            headers: {
                "x-rapidapi-key": GST_API_KEY,
                "x-rapidapi-host": GST_API_HOST,
            },
        });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data || error.message);
    }
}

//simple use
// import validateGSTIN from "../config/gstConfig";

// const result = await validateGSTIN("24aadck1665m1zd");
// console.log(result);



// smaple =? response 
// {
//   "gstin": "24AADCK1665M1ZD",
//   "valid": true,
//   "state": "Gujarat",
//   "pan": "AADCK1665M"
// }

// meet
// 24PUSPK4787H1ZL

module.exports = validateGSTIN;
