import { puter } from '@heyputer/puter.js';

async function test() {
    try {
        console.log("Calling puter.ai.chat...");
        const response = await puter.ai.chat("What is 2+2?", { model: "gpt-4o" });
        console.log("Response:", response);
    } catch (err) {
        console.error("Error:", err);
    }
}

test();
