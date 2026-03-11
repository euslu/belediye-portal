const prisma = require('./prisma');

/**
 * Ticket aktivitesi oluştur.
 * @param {object} opts
 * @param {number}  opts.ticketId
 * @param {number|null} opts.userId   - işlemi yapan kullanıcı DB id'si
 * @param {string}  opts.action       - ActivityAction enum değeri
 * @param {string}  [opts.fromValue]
 * @param {string}  [opts.toValue]
 * @param {string}  [opts.comment]
 */
async function logActivity({ ticketId, userId, action, description, fromValue, toValue, comment }) {
  return prisma.ticketActivity.create({
    data: {
      ticketId,
      userId:      userId      || null,
      action,
      description: description || null,
      fromValue:   fromValue   || null,
      toValue:     toValue     || null,
      comment:     comment     || null,
    },
  });
}

module.exports = { logActivity };
