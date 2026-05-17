module.exports = async function (context, req) {
    try {
        const response = await fetch(process.env.SCANNER_URL + "/scans", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req.body)
        });

        const data = await response.text();

        context.res = {
            status: response.status,
            body: data
        };

    } catch (err) {
        context.res = {
            status: 500,
            body: err.toString()
        };
    }
};