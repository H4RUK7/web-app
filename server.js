// server.js
const express = require('express');
const axios = require('axios');
const app = express();

app.get('/api/products', async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.spoonacular.com/food/products/search?query=${req.query.q}`,
      { params: { apiKey: process.env.SPOONACULAR_API_KEY } }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.listen(3000);