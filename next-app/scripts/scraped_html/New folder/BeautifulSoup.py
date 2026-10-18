import csv
import glob
import os
import re
from bs4 import BeautifulSoup

def extract_data_from_html_segment(segment_content, source_filename):
    """Processes a single segment of HTML to extract Batch and Member info."""
    soup = BeautifulSoup(segment_content, 'html.parser')
    
    # 1. Extract Batch ID from Meta URL
    batch_id = "NA"
    og_url = soup.find('meta', property='og:url')
    if og_url:
        match = re.search(r'/batches/(\d+)/', og_url['content'])
        if match:
            batch_id = match.group(1)

    # 2. Extract Batch Name
    batch_name = "NA"
    header = soup.find('h2')
    if header:
        batch_name = " ".join(header.get_text().strip().split())
    
    # Fallback for Batch Name from internal JS variable if header is empty
    if not batch_name or batch_name == "NA":
        script_match = re.search(r'batchName:\s*"([^"]+)"', segment_content)
        if script_match:
            batch_name = script_match.group(1)

    # 3. Extract Members (Numeric ID and Email)
    numeric_member_ids = []
    emails = []

    tbody = soup.find('tbody', class_='divide-y')
    if tbody:
        rows = tbody.find_all('tr')
        for row in rows:
            cols = row.find_all('td')
            if len(cols) >= 4:
                # Target the link inside the 2nd column for Numeric ID
                # Structure: <a href="/members/5637/">sugangopal1992</a>
                user_link = cols[1].find('a', href=True)
                if user_link:
                    member_match = re.search(r'/members/(\d+)/', user_link['href'])
                    if member_match:
                        numeric_member_ids.append(member_match.group(1))
                
                # Email ID (4th column)
                email_text = cols[3].get_text(strip=True)
                if email_text:
                    emails.append(email_text)

    # Return as a list for the CSV row
    return [
        batch_id, 
        batch_name, 
        ", ".join(numeric_member_ids), 
        ", ".join(emails), 
        source_filename
    ]

def process_all_files(output_csv):
    html_files = glob.glob("*.html")
    header = ["Batch ID", "Batch Name", "Members ID (Numeric)", "Emails", "Source File"]
    
    final_rows = []
    
    for file_path in html_files:
        print(f"Reading file: {file_path}")
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
            # Split the file into separate Batch blocks based on the closing </html> tag
            # This handles files that have 10+ batches pasted one after another
            segments = content.split('</html>')
            
            for segment in segments:
                if "batches/" in segment: # Only process segments that actually contain batch data
                    row = extract_data_from_html_segment(segment, os.path.basename(file_path))
                    final_rows.append(row)

    # Write to CSV
    with open(output_csv, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(final_rows)

    print(f"\n--- Processing Complete ---")
    print(f"Total Batches Found: {len(final_rows)}")
    print(f"Results saved to: {output_csv}")

if __name__ == "__main__":
    process_all_files('consolidated_batch_report.csv')