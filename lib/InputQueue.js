function InputQueue() {
    this.buffer = Buffer.from('')
}

InputQueue.prototype.fetchBytes = function(numBytes) {
    if (numBytes > this.buffer.length) {
        return null
    }
    let bytes = this.buffer.slice(0, numBytes)
    this.buffer = this.buffer.slice(numBytes)
    return bytes
}

InputQueue.prototype.fetchString = function(length) {
    if (length > this.buffer.length) {
        return null
    }
    let result = this.buffer.slice(0, length).toString('ascii')
    this.buffer = this.buffer.slice(length)
    return result
}

InputQueue.prototype.add = function(data) {
    this.buffer = Buffer.concat([this.buffer, data])
}

InputQueue.prototype.flush = function() {
    this.buffer = Buffer.from('')
}

module.exports = InputQueue