const m = require("mongoose");
(async () => {
  await m.connect("mongodb://127.0.0.1:27017/ecommerce");
  const Order = m.model("Order", new m.Schema({
    trackingNumber: String, courier: String, orderStatus: String, paymentStatus: String,
  }));
  const restore = [
    { trackingNumber: "DEMO-ORD-1", orderStatus: "delivered", trackingNumberKeep: "DEMO-ORD-1", courier: "Demo Express" },
    { trackingNumber: "DEMO-ORD-2", orderStatus: "shipped",   trackingNumberKeep: "DEMO-ORD-2", courier: "Demo Express" },
    { trackingNumber: "DEMO-ORD-3", orderStatus: "processing", trackingNumberKeep: "DEMO-ORD-3", courier: "Demo Express" },
  ];
  for (const r of restore) {
    const o = await Order.findOne({ trackingNumber: r.trackingNumberKeep });
    if (o) {
      o.orderStatus = r.orderStatus;
      o.trackingNumber = r.trackingNumberKeep;
      o.courier = r.courier;
      o.paymentStatus = "paid";
      await o.save();
      console.log(r.trackingNumberKeep, "->", r.orderStatus);
    } else {
      console.log("not found:", r.trackingNumberKeep);
    }
  }
  // If DEMO-ORD-3 was renamed to TEST-TRK-123, fix that too
  const renamed = await Order.findOne({ trackingNumber: "TEST-TRK-123" });
  if (renamed) {
    renamed.trackingNumber = "DEMO-ORD-3";
    renamed.orderStatus = "processing";
    await renamed.save();
    console.log("renamed TEST-TRK-123 -> DEMO-ORD-3");
  }
  await m.disconnect();
})();
