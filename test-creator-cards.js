/* eslint-disable no-restricted-syntax, no-await-in-loop */
const axios = require('axios');

const baseURL = 'http://localhost:8811';

const testCases = [
  {
    name: 'Test Case 1 - Full creation with all fields',
    method: 'POST',
    path: '/creator-cards',
    data: {
      title: 'George Cooks',
      description: 'Weekly cooking podcast',
      slug: 'george-cooks',
      creator_reference: 'crt_8f2k1m9x4p7w3q5z',
      links: [{ title: 'YouTube', url: 'https://youtube.com/@georgecooks' }],
      service_rates: {
        currency: 'NGN',
        rates: [{ name: 'IG Story Post', description: 'One story mention', amount: 5000000 }],
      },
      status: 'published',
    },
  },
  {
    name: 'Test Case 2 - Slug auto-generation',
    method: 'POST',
    path: '/creator-cards',
    data: {
      title: 'Ada Designs Things',
      creator_reference: 'crt_a1b2c3d4e5f6g7h8',
      status: 'published',
    },
  },
  {
    name: 'Test Case 3 - Private card creation',
    method: 'POST',
    path: '/creator-cards',
    data: {
      title: 'VIP Rate Card',
      creator_reference: 'crt_x9y8z7w6v5u4t3s2',
      status: 'published',
      access_type: 'private',
      access_code: 'A1B2C3',
    },
  },
];

async function runTests() {
  console.log('\n========== CREATOR CARD API TESTS ==========\n');

  for (const testCase of testCases) {
    console.log(`\n${testCase.name}`);
    console.log('-------------------------------------------');

    try {
      const response = await axios({
        method: testCase.method,
        url: `${baseURL}${testCase.path}`,
        data: testCase.data,
      });

      console.log(`✅ Status: ${response.status}`);
      console.log(`✅ Message: ${response.data.message}`);

      const cardData = response.data.data;

      console.log(`✅ Response has 'id' field: ${!!cardData.id}`);
      console.log(`✅ Response does NOT have '_id' field: ${!cardData._id}`);
      console.log(`✅ Slug: ${cardData.slug}`);
      console.log(`✅ Access Type: ${cardData.access_type}`);

      if (testCase.data.access_type === 'private') {
        console.log(`✅ Access Code present: ${!!cardData.access_code}`);
      }

      console.log(`✅ Status: ${cardData.status}`);
      console.log(`✅ Created timestamp: ${cardData.created}`);
    } catch (error) {
      console.log(`❌ Error: ${error.response?.status || error.message}`);
      if (error.response?.data) {
        console.log(`   Message: ${error.response.data.message}`);
        console.log(`   Code: ${error.response.data.code}`);
        if (error.response.data.data) {
          console.log(`   Details:`, JSON.stringify(error.response.data.data, null, 2));
        }
      } else {
        console.log(`   Full error:`, error.message);
      }
    }
  }

  console.log('\n========== TESTS COMPLETE ==========\n');
}

runTests();
