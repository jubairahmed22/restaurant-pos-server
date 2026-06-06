const express = require('express');
const ctrl    = require('./floor-plan.controller');
const { protect, authorize } = require('../../middleware/auth');

const router = express.Router();

router.get ('/',                      protect, ctrl.getAll);
router.post('/',                      protect, authorize('admin'), ctrl.create);
router.get ('/:id',                   protect, ctrl.getOne);
router.put ('/:id',                   protect, authorize('admin'), ctrl.update);
router.delete('/:id',                 protect, authorize('admin'), ctrl.remove);

router.post  ('/:id/sections',        protect, authorize('admin'), ctrl.addSection);
router.delete('/:id/sections/:sectionId', protect, authorize('admin'), ctrl.removeSection);

router.put ('/:id/layout',            protect, authorize('admin', 'staff'), ctrl.saveLayout);

module.exports = router;
