const express = require('express')
const Product = require('../controllers/ProductController');
const productRouter = express.Router();
const pInstance = new Product();
const upload = require('../middleware/UploadMiddleware');

productRouter.get('/',  pInstance.index);
productRouter.post('/',upload.array('images', 5), pInstance.store);
productRouter.get('/search', pInstance.search);
productRouter.get('/:id', pInstance.show);
productRouter.put('/:id', upload.array('images', 5), pInstance.update);
productRouter.delete('/:id', pInstance.destroy);
productRouter.delete('/images/:id/:imageName', pInstance.deleteImage);


module.exports = productRouter;