export function formatError(err) {
  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return new Error(`Validation Error: ${messages.join(', ')}`);
  }
  
  // Handle CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return new Error('Invalid ID format');
  }
  
  // Handle duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return new Error(`Duplicate value for ${field}`);
  }
  
  // Return original error if no transformation needed
  return err;
}