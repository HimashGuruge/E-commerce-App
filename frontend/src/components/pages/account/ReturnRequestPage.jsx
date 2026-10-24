import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/utils/api";
import Swal from "sweetalert2";
import getApiError from "@/utils/errors";
import { FiPackage, FiCheckCircle, FiXCircle, FiAlertTriangle, FiPhone, FiMail, FiCalendar } from "react-icons/fi";

export default function ReturnRequestPage() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    reason: "change_of_mind",
    reasonText: "",
    condition: "as_new",
    notes: "",
    photos: []
  });

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/orders/${orderId}`);
      if (res.data.success) {
        setOrder(res.data.order);
        
        // Set default reason based on order items
        if (res.data.order.items?.[0]?.returnReason) {
          setFormData(prev => ({
            ...prev,
            reason: res.data.order.items[0].returnReason
          }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch order:", err);
      Swal.fire({ icon: "error", title: "Error", text: "Order not found" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.reasonText.trim() && formData.reason !== "other") {
      Swal.fire({ icon: "warning", title: "Missing Info", text: "Please provide more details about your return" });
      return;
    }
    if (formData.reasonText.length > 500 || formData.notes.length > 1000) {
      return;
    }

    try {
      const payload = {
        orderId,
        reason: formData.reason,
        reasonText: formData.reason === "other" ? formData.reasonText : "",
        condition: formData.condition,
        notes: formData.notes,
        photos: formData.photos
      };

      const res = await api.post("/api/feedback/returns/initiate", payload);
      
      if (res.data.success) {
        Swal.fire({
          icon: "success",
          title: "Return Request Submitted!",
          text: "You will receive an email with return instructions shortly.",
          timer: 3000,
          showConfirmButton: false
        });
        
        // Update order with return request ID
        await api.patch(`/api/orders/${orderId}`, { returnRequestId: res.data.returnRequest._id });
        
        navigate("/orders");
      }
    } catch (err) {
      console.error("Failed to submit return:", err);
      Swal.fire({ icon: "error", title: "Error", text: getApiError(err, "Failed to submit return request") });
    }
  };

  const handleReasonChange = (reason) => {
    setFormData(prev => ({ ...prev, reason, reasonText: "" }));
  };

  const handleConditionChange = (condition) => {
    setFormData(prev => ({ ...prev, condition }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading order...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FiPackage className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Order not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/orders")}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <FiCheckCircle size={16} />
            Back to Orders
          </button>
          <h1 className="text-3xl font-black text-gray-900">Request Return</h1>
          <p className="text-gray-600 mt-2">Order #{orderId.slice(-8)}</p>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>
          <div className="space-y-3">
            {order.items?.map((item, idx) => (
              <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <img
                  src={item.product?.images?.[0] || "https://placehold.co/100"}
                  alt={item.product?.name || "Product"}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.product?.name}</p>
                  <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                  <p className="text-sm font-bold text-gray-900">Rs. {(item.sellingPrice || item.price).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Return Form */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <FiAlertTriangle className="text-yellow-500" />
            Return Details
          </h2>

          {/* Reason */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-3">Reason for Return</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {["defective", "wrong_item", "not_as_described", "damaged_on_arrival", "change_of_mind", "other"].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => handleReasonChange(reason)}
                  className={`p-3 rounded-lg border-2 text-sm font-bold transition-all ${
                    formData.reason === reason
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {reason.replace("_", " ").split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                </button>
              ))}
            </div>
          </div>

          {/* Additional Details */}
          {formData.reason === "other" && (
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">Please specify your reason</label>
              <textarea
                value={formData.reasonText}
                onChange={(e) => setFormData(prev => ({ ...prev, reasonText: e.target.value }))}
                placeholder="Describe your return reason..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                rows={3}
              />
              {formData.reasonText.length > 500 && <p className="mt-2 text-xs text-red-600">Please keep your reason under 500 characters.</p>}
            </div>
          )}

          {/* Condition */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-3">Item Condition</label>
            <div className="space-y-2">
              {["as_new", "minor_defect", "major_defect"].map((condition) => (
                <button
                  key={condition}
                  type="button"
                  onClick={() => handleConditionChange(condition)}
                  className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                    formData.condition === condition
                      ? "border-brand-600 bg-brand-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {condition === "as_new" && <FiCheckCircle className="text-green-500" size={20} />}
                  {condition === "minor_defect" && <FiAlertTriangle className="text-yellow-500" size={20} />}
                  {condition === "major_defect" && <FiXCircle className="text-red-500" size={20} />}
                  <span className="font-bold text-gray-900 capitalize">
                    {condition.replace("_", " ")}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Additional Notes */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">Additional Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any other information about your return..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
              rows={3}
            />
            {formData.notes.length > 1000 && <p className="mt-2 text-xs text-red-600">Please keep additional notes under 1000 characters.</p>}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            className="w-full bg-brand-600 text-white px-6 py-4 rounded-xl font-bold hover:bg-brand-700 transition-all shadow-lg hover:shadow-xl"
          >
            Submit Return Request
          </button>
        </div>

        {/* Refund Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <FiCheckCircle className="text-blue-600" />
            Refund Information
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              You will receive an email with return instructions within 24 hours.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              Refunds are processed within 5-7 business days after we receive your return.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              Original shipping charges are non-refundable.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
