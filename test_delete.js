import pool from './src/db/pool.js';

async function test() {
    try {
        console.log("Creating test user...");
        const userRes = await pool.query("INSERT INTO users (email, password_hash) VALUES ('test_del@example.com', 'hash') RETURNING id");
        const userId = userRes.rows[0].id;
        
        console.log("Creating test endpoint...");
        const epRes = await pool.query("INSERT INTO endpoints (user_id, url) VALUES ($1, 'http://test.com') RETURNING id", [userId]);
        const epId = epRes.rows[0].id;

        console.log("Inserting probe results to trigger foreign keys...");
        await pool.query("INSERT INTO probe_results (endpoint_id, status_code, response_time_ms) VALUES ($1, 200, 100)", [epId]);
        await pool.query("INSERT INTO endpoint_scores (endpoint_id, score) VALUES ($1, 0.5)", [epId]);
        await pool.query("INSERT INTO incidents (endpoint_id) VALUES ($1)", [epId]);

        console.log("Attempting to delete endpoint...");
        const delRes = await pool.query("DELETE FROM endpoints WHERE id = $1 AND user_id = $2 RETURNING id", [epId, userId]);
        console.log("Delete result:", delRes.rows);

        console.log("Cleaning up user...");
        await pool.query("DELETE FROM users WHERE id = $1", [userId]);
        
        console.log("Success!");
    } catch (err) {
        console.error("Test failed:", err);
    } finally {
        await pool.end();
    }
}

test();
