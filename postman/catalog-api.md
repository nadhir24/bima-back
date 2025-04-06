# Dokumentasi API Catalog

## Update Catalog

### Endpoint

`PUT /catalog/{id}`

### Request Body

Gunakan form-data dengan field berikut:

```json
{
  "sizes": [
    {
      "id": 10,
      "size": "10x10",
      "qty": 15,
      "price": "Rp100.000"
    }
  ]
}
```

### Catatan Penting

1. Untuk update sizes saja, cukup kirim array `sizes` yang berisi objek dengan data yang ingin diupdate
2. Setiap objek size HARUS memiliki `id` yang valid (id size yang sudah ada)
3. Field yang bisa diupdate untuk setiap size:
   - `size`: ukuran produk (opsional jika hanya update qty/price)
   - `qty`: jumlah stok baru
   - `price`: harga baru (dalam format string dengan awalan 'Rp' dan titik sebagai pemisah ribuan)
4. Tidak perlu mengirim field catalog lainnya (name, category, dll) jika hanya ingin update sizes
5. Bisa update multiple sizes sekaligus dengan menambahkan objek size lain ke dalam array

### Contoh Request di Postman

1. Buka Postman
2. Pilih method PUT
3. Masukkan URL: `http://localhost:3000/catalog/{id}` (ganti {id} dengan ID catalog yang ingin diupdate)
4. Pilih tab "Body" dan pilih "form-data"
5. Tambahkan field `sizes` dengan nilai array JSON seperti contoh di atas
6. Klik "Send" untuk mengirim request

### Response

Jika berhasil, API akan mengembalikan data catalog yang sudah diupdate dengan status 200 OK.

### Error Response

Jika terjadi kesalahan, API akan mengembalikan:

- Status 400 Bad Request jika format data tidak sesuai atau size ID tidak valid
- Status 404 Not Found jika catalog tidak ditemukan
