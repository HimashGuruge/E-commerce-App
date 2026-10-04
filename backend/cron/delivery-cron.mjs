import mongoose from 'mongoose'
import Order from './models/Order.js'
import dotenv from 'dotenv'
dotenv.config()

// Threshold: auto-deliver after N days in "shipped" status
const DELIVERY_DAYS = 3

async function autoDeliver() {
  const cutoff = new Date(Date.now() - DELIVERY_DAYS * 24 * 60 * 60 * 1000)

  const result = await Order.updateMany(
    {
      orderStatus: 'shipped',
      updatedAt: { $lte: cutoff },
    },
    {
      $set: {
        orderStatus: 'delivered',
        domexStatus: 'delivered',
      },
    }
  )

  console.log(`[${new Date().toISOString()}] Auto-delivered ${result.modifiedCount} orders (shipped before ${cutoff.toISOString()})`)
}

try {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/app')
  console.log('MongoDB connected')
  await autoDeliver()
  await mongoose.disconnect()
  console.log('Done')
  process.exit(0)
} catch (err) {
  console.error('Error:', err.message)
  process.exit(1)
}
