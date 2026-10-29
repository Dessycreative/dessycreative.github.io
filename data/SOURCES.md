# Data sources

## agri.csv

- **Table:** AQA04, Area, Yield and Production of Crops (Central Statistics Office, Ireland)
- **URL:** https://data.cso.ie/table/AQA04 (API: https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/AQA04/CSV/1.0/en)
- **Retrieved:** 2026-10-29 with `scripts/fetch-data.mjs`
- **Changes:** reshaped to `year,crop,statistic,unit,value`; rows with no value dropped.
- **Licence:** CC BY 4.0. Source: Central Statistics Office, Ireland (CC BY 4.0)
