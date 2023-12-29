import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import pandas as pd
import sqlite3
import os
import re


#Verifique se o caminho do banco de dados foi passado como um argumento
# if len(sys.argv) > 1:
#     dbPath = sys.argv[1]
# else:
#     print("Database path not provided.")
#     sys.exit(1)

# Construir o caminho para o banco de dados
appdata_path = os.getenv('APPDATA')  # Obtém o caminho para a pasta AppData do usuário atual
db_path = os.path.join(appdata_path, 'anansidb', 'anansi.db')

print(f"{db_path} recebido pelo anansi.exe")
# Conecte-se ao banco de dados usando o caminho fornecido
conn = sqlite3.connect(db_path)
print(db_path)

# Obtenha o valor diretamente da consulta
base_url_row = conn.execute("SELECT link FROM anansi WHERE rowid = 1").fetchone()

print(f"{base_url_row} recebido pelo anansi.exe")
# URL base do aplicativo no Google Play
base_url = base_url_row[0] if base_url_row else None

# Configure the WebDriver to run in headless mode (ensure you have the appropriate driver installed)
options = webdriver.ChromeOptions()
options.add_argument('--headless')  # Run in headless mode

# Create the WebDriver with the specified options
driver = webdriver.Chrome(options=options)

# Construct the URL for the current page
url = base_url

# Open the page in the browser
driver.get(url)

# Get the app name
app_name_element = driver.find_element(By.CSS_SELECTOR, 'h1[itemprop="name"]')
app_name = app_name_element.text
print(f"Nome do aplicativo: {app_name}")

num_reviews_element = driver.find_element(By.CSS_SELECTOR, 'div.EHUI5b')

# Get the element's text
num_reviews_text = num_reviews_element.text
print("Número de avaliações:", num_reviews_text)

try:
    # Wait until the "See all reviews" button is clickable
    try:
        ver_todas_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(.,'See all reviews')]"))
        )
    except:
        ver_todas_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(.,'Ver todas as avaliações')]"))
        )

    print("double try worked in the anansi.exe")
    # Click the button
    ver_todas_button.click()

    # Wait for a short period after the click
    time.sleep(2)

    # Initialize lists to store review data
    rating_values = []
    review_dates = []
    review_contents = set()  # Use a set to avoid duplicates

    # Set the maximum number of reviews to collect
    max_reviews = 100

    # Loop to scroll the page and collect reviews
    while True:
        # Get the page content after the wait
        page_content = driver.page_source
        # Parse the HTML content using BeautifulSoup
        soup = BeautifulSoup(page_content, "html.parser")

        # Extract rating values
        ratings = soup.find_all("div", class_="iXRFPc")
        rating_values.extend([rating.get("aria-label") for rating in ratings])

        # Extract review dates
        dates = soup.find_all("span", class_="bp9Aid")
        review_dates.extend([date.get_text() for date in dates])

        # Extract review contents
        reviews = soup.find_all("div", class_="h3YV2d")
        new_reviews = {review.get_text(strip=True) if review else None for review in reviews}

        # Add only unique reviews to the list
        review_contents.update(new_reviews)

        # Check immediately after adding
        if len(review_contents) >= max_reviews:
            # Limit the list to a maximum of max_reviews elements
            review_contents = set(list(review_contents)[:max_reviews])
            break

        # Scroll to the last review element
        try:
            last_review = driver.find_elements(By.CSS_SELECTOR, 'div.h3YV2d')[-1]
            last_review.location_once_scrolled_into_view
        except IndexError:
            # No more review elements
            break

        # Wait for a short period before trying to scroll again
        time.sleep(2)

except Exception as e:
    print(f"Erro ao clicar no botão: {e}")

# Close the browser
driver.quit()

# Convert the set to a list
review_contents_list = list(review_contents)

# Ensure that all lists have the same length
min_length = min(len(rating_values), len(review_dates), len(review_contents_list))
rating_values = rating_values[:min_length]
review_dates = review_dates[:min_length]
review_contents_list = review_contents_list[:min_length]

# Create a DataFrame to store the data
table_name = f"comments_{app_name.lower().replace(' ', '_')}"
table_name = re.sub(r'[^a-zA-Z0-9_]', '', table_name)
print(f"table name {table_name} passed regex.")
comments_df = {
    "Rating": rating_values,
    "Date": review_dates,
    "Review": review_contents_list
}
comments_df = pd.DataFrame(comments_df)

# Save the data in SQLite with the custom table name
comments_df.to_sql(table_name, conn, if_exists="replace", index=False)
print("Worked successfully!")

conn.close()

#app_link = url

import app_info

try:
    app_info.google_store_app_data(db_path, url)
except Exception as e:
    print(f"An error occurred while running the function: {e}")
