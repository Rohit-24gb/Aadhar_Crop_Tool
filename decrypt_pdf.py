import sys
from PyPDF2 import PdfReader, PdfWriter

input_path = sys.argv[1]
password = sys.argv[2]
output_path = sys.argv[3]

reader = PdfReader(input_path)

if reader.is_encrypted:
    success = reader.decrypt(password)
    if success == 0:
        print("Error: Wrong password or unable to decrypt.")
        sys.exit(1)

writer = PdfWriter()

for page in reader.pages:
    writer.add_page(page)

with open(output_path, "wb") as f:
    writer.write(f)

print("PDF decrypted successfully.")







# import sys
# from PyPDF2 import PdfReader, PdfWriter

# # Usage:
# # python decrypt_pdf.py encrypted.pdf password decrypted.pdf

# input_path = sys.argv[1]
# password = sys.argv[2]
# output_path = sys.argv[3]

# reader = PdfReader(input_path)

# if reader.is_encrypted:
#     success = reader.decrypt(password)
#     if success == 0:
#         print("Error: Wrong password or unable to decrypt.")
#         sys.exit(1)

# writer = PdfWriter()

# for page in reader.pages:
#     writer.add_page(page)

# with open(output_path, "wb") as f:
#     writer.write(f)

# print("PDF decrypted successfully.")
