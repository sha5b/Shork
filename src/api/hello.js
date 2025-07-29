/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
export default function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Hello from the API!' }));
}
