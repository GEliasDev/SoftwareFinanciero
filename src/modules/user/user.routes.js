import { Router } from 'express';
import { UserController } from './user.controller.js';

const router = Router();

router.post('/login', UserController.login);
router.post('/', UserController.createUser);
router.get('/', UserController.getAllUsers);
router.get('/:id', UserController.getUserById);
router.patch('/:id', UserController.updateUser);
router.delete('/:id', UserController.deleteUser);

export default router;
